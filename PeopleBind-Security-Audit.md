# PeopleBind — Security Audit & Module Logic Review

*3 Sep 2026, ahead of onboarding real clients. Covers RLS/tenant isolation,
RBAC, storage, all 6 edge functions, frontend security patterns, and the
core payroll/leave/attendance calculation engines. Every finding below was
confirmed by reading the actual deployed function/policy — nothing here is
inferred.*

*Second pass, 4 Sep 2026 — closed the "not covered in this pass" gap from
§4 below: every write policy across all ~97 tables (up from ~90 at the
first pass — Surveys, LMS, Company Events, ClickUp integration, and Salary
Bands all shipped in between), plus a deeper look at Recruitment,
Timesheets/ClickUp, and Employee Settlements. Findings in §1.6–1.9.*

---

## 1. Fixed during this audit

### 1.1 `send-email` was an open relay — **CRITICAL, fixed**

The edge function had `verify_jwt: true` but did **no check on who was
calling**. `verify_jwt` only proves the request carried *some* validly-signed
project JWT — the public anon key (embedded in any frontend bundle, not a
secret) satisfies that on its own. In practice this meant anyone holding
PeopleBind's public anon key — i.e. anyone — could call
`supabase.functions.invoke('send-email', {...})` directly with an arbitrary
`to`/`subject`/`html` and send email as PeopleBind, through PeopleBind's own
Resend account, to any address. No login, no company scoping, no rate limit.
Real exposure: sending-domain reputation/blacklisting, cost, and a
ready-made phishing vector ("from PeopleBind").

**Fix (deployed, version 7):** the function now requires one of two things,
mirroring the pattern this project already uses correctly for
`embed-document`/`generate-support-draft`/`clickup-sync`:
- An `X-Internal-Secret` header matching a new Vault-stored secret
  (`send_email_trigger_secret`), for the server-triggered path — leave
  approval/rejection emails, expense/timesheet status emails, etc., which
  call in via `send_transactional_email()` and have no user session to
  present.
- A real signed-in user resolved via `auth.getUser()`, for the two direct
  frontend callers (`Payroll.jsx`'s "Email payslip" and `Settings.jsx`'s
  "Invite teammate" flow).

`send_transactional_email()` (the SQL wrapper every trigger function calls)
was updated in the same change to send the new header — verified the
secret resolves correctly and `get_send_email_trigger_secret()` is
`service_role`-only (same grant shape as `get_embed_trigger_secret()`),
confirmed via `get_advisors` that no new findings were introduced.

**Caught before shipping:** the first fix attempt (auth-only, no internal
path) would have broken every automated notification email —
`send_transactional_email()` has no user JWT to present. Caught by tracing
every real caller before considering it done, not by testing in production.

### 1.2 `branches` write policy had no permission gate — **fixed**

Every other admin-content table (holidays, courses, company events...)
gates writes on `settings:manage`; `branches` gated only on company
membership, so any employee could rename a branch or edit its geofence
location/radius. Now matches the same shape — reads company-wide, writes
require `settings:manage`.

### 1.3 `link_employee_account` — silent ESS account linking — **fixed**

ESS self-linking matches on company slug (public) + `employee_code` +
`personal_email`. Employee codes are commonly sequential
(`EMP-0001`, `EMP-0002`...) and a personal email is often discoverable, so
this 3-factor match is guessable with effort, and there was no signal to
the real employee when a link succeeded. Doesn't prevent a bad link, but
`link_employee_account` now emails the employee whenever their record
gets linked, so an unauthorized one is detectable and reportable rather
than silent. (A real invite-token flow would close this further — flagged
as a possible future hardening, not done here.)

### 1.4 AI-rendered markdown links had no scheme validation — **fixed**

[`markdown.jsx`](src/lib/markdown.jsx)'s link parser rendered `[text](url)`
into a real `<a href>` with no scheme check. React does not sanitize
`javascript:`/`data:` URLs the way it protects against
`dangerouslySetInnerHTML` — a markdown link with a `javascript:` href
renders as a live, clickable, exploitable link. This renderer is used for
AI chat responses and the AI candidate-ranking assessment — both render
text that isn't purely admin-authored (a resume's content flows into the
ranking prompt; a sufficiently motivated prompt-injection attempt in a
resume could try to get the model to emit such a link). Now rejects
anything but `http:`/`https:`/`mailto:` and falls back to plain text.

### 1.5 Payroll: no proration for mid-period joiners or leavers — **fixed, 4 Sep 2026**

`run_payroll_calculation()` used to pull every eligible employee and pay
them a full period's basic salary and allowances regardless of actual
days employed — no check against `joining_date`, no day-proration
anywhere. Fixed:

- **Proration**: `days_employed_in_period ÷ standard_monthly_days`
  (clamped to 1), reusing the exact divisor `standard_monthly_days`
  already used for unpaid-leave deduction — no new day-count convention
  introduced. Applies to every salary-structure line item (earnings and
  deductions alike), so a partial period scales the whole structure
  proportionally, not just basic. A full-period employee's fraction
  always clamps to exactly 1, so existing payroll runs are byte-identical
  to before — nothing changes unless someone actually joined or left
  mid-period.
- **Rate math (overtime, unpaid leave) stays on the nominal, unprorated
  basic** — an employee's per-hour/per-day salary *rate* doesn't shrink
  just because they joined late; only the amount they're actually paid
  for the period does. Using the prorated figure there would have
  under-priced their overtime and under-deducted their unpaid leave — a
  second, compounding bug avoided by keeping these as two separate
  values internally.
- **Also fixed a related gap**: the employee-selection query had no
  `joining_date <= period_end` check at all, so a pre-onboarded employee
  whose start date is still in the future could have been swept into a
  run and paid for a period that hasn't started for them.
- **Statutory contributions (EOBI/SESSI/PESSI/KPESSI/BESSI) deliberately
  left on the fixed minimum-wage base, unprorated** — real, documented
  scope boundary. Provident Fund naturally follows the now-prorated
  basic (it's based on `v_basic_amount`, not the fixed base), which is
  correct; the others are pegged to a fixed statutory figure unrelated
  to actual salary, and I'm not certain enough of Pakistani proration
  rules for those specific contributions to guess at changing them.
- **`get_payroll_exceptions`** now flags "Joined mid-period" / "Exits
  mid-period — pay will be prorated" before the run is finalized, closing
  the "invisible to HR" half of the original finding.

**Verified against real data, not just the formula**: built a throwaway
test company (3 employees — full-period, joined mid-period on day 20 of a
31-day period, and exits mid-period on day 10), ran the actual deployed
calculation, and confirmed exact amounts (e.g. Rs 26,000 basic → Rs
12,000.00 for the 12-of-26-day joiner, Rs 10,000.00 for the 10-of-26-day
leaver, House Allowance prorated identically, EOBI unchanged at Rs 370 for
all three as intended) and confirmed a second recalculation stays
idempotent (9 items, not 18). All test data deleted afterward — zero
residue in the real database.

### 1.6 `audit_log` accepted a forged INSERT from any employee — **fixed, 4 Sep 2026**

Every legitimate write to `audit_log` (~40 tables' worth of INSERT/UPDATE/
DELETE triggers) goes through `log_audit_event()`, a `SECURITY DEFINER`
trigger function — and both it and the `audit_log` table are owned by
`postgres`, so table-owner writes bypass RLS entirely regardless of any
policy. But the table also had a separate `authenticated`-facing INSERT
policy checking only `company_id = auth_company_id()` — no restriction on
`user_id`, `table_name`, `record_id`, `action`, `old_data`, or `new_data`.
Real writes never used this path (confirmed: no frontend code inserts into
`audit_log` directly), but it was still reachable — any signed-in employee
could `POST /rest/v1/audit_log` with an arbitrary forged entry (including
misattributing it to a different `user_id`) for their own company, which
defeats the point of an audit trail meant to be a trustworthy compliance
record once real clients are relying on it. **Fix:** dropped the policy —
legitimate logging is entirely unaffected since it never depended on it.

### 1.7 `feedback_notes` let anyone impersonate the note's author — **fixed, 4 Sep 2026**

The Performance → Feedback tab is deliberately open — any employee can
leave an informal note about any colleague ("quick, informal notes...
separate from formal reviews," no permission gate, by design, same spirit
as Kudos). But unlike `kudos_insert` (which correctly requires
`from_employee_id = auth_employee_id()`), `feedback_notes_insert` never
checked that `given_by` matched the caller — so anyone could insert a note
about a colleague and attribute it to a different employee (e.g. writing a
harsh note and making it look like it came from that colleague's manager).
**Fix:** added `given_by = auth.uid()` to the insert check, mirroring
Kudos' existing pattern exactly. The open "anyone can leave a note about
anyone" design is untouched — only the forged-authorship path is closed.

### 1.8 Self-reported time entries could spoof a ClickUp-verified badge — **fixed, 4 Sep 2026**

The Timesheets → ClickUp sync integration (shipped since the first pass)
tags automatically-imported entries `source: 'clickup'`, and the Entries
tab shows a badge based on that column so a reviewing manager can tell a
machine-verified entry from a self-reported one. But `time_entries`'
self-service INSERT policy (an employee logging their own time) never
restricted the `source`/`external_id` columns — an employee could self-
insert a fabricated entry tagged `source: 'clickup'` to make it read as
verified. **Fix:** the self-service branch now also requires
`source = 'manual'`; only the `clickup-sync` Edge Function's service-role
client (which bypasses RLS by design, same as `clickup_connections`) can
write `source: 'clickup'` rows. The manager-approval branch — also how
CSV-imported rows get their `source` set — is untouched.

### 1.9 Finalizing a settlement overwrote a recorded resignation as a termination — **fixed, 4 Sep 2026**

`finalize_employee_settlement()` unconditionally set
`employees.employment_status = 'terminated'` on every exit, even when HR
had already recorded the real reason via the Edit Employee form (a
supported path — the Offboard card's own copy already branches on
"is marked resigned" vs "is marked terminated" *before* a settlement is
run). Since running a Full & Final Settlement is the normal step for
every departing employee regardless of exit reason, this meant a
voluntary resignation was silently reclassified as an involuntary
termination the moment the settlement was finalized — corrupting the
`voluntary_turnover_rate` / `involuntary_turnover_rate` split in Dashboards
and the resigned-employee query `dashboardMetrics.js` already runs.
**Fix:** the function now preserves an already-recorded `'resigned'`
status and only defaults to `'terminated'` when no exit reason was set
yet (the common case the existing copy describes). **Verified against real
execution**: a throwaway employee pre-marked `resigned` stayed `resigned`
after finalization; one left at the default `confirmed` status correctly
defaulted to `terminated` — both run through the actual (test-copy of the)
finalize logic, not just read from the source. Test data fully cleaned up.

---

## 2. Findings not yet fixed — for you to prioritize

### 2.1 Performance advisors, not urgent now

`get_advisors(type: performance)` flagged 32 `auth_rls_initplan` (RLS
policies calling `auth.uid()`/helpers without wrapping in `(select ...)`,
so Postgres re-evaluates per-row instead of once per query) and 305
`multiple_permissive_policies`. Neither is wrong, both add planner
overhead that will matter more at real client scale than today's handful
of rows. Worth a dedicated pass before heavy usage, not before launch.

### 2.2 `onboarding_tasks_self_complete` allows more than "complete" — not fixed, low severity

The RLS policy letting an employee (or their manager) update their own
onboarding task is row-scoped correctly (only their own/their report's
tasks), but not column-scoped — it permits changing any column on that
row, not just marking it done, so a crafted direct request could let an
employee retitle or reschedule their own onboarding task, not just
complete it. Real-world impact is low (worst case is an employee editing
their own onboarding checklist item's text/due date) and this mirrors a
pattern already accepted elsewhere in this app (RLS enforces row
ownership; the frontend, not a column-level grant, is what limits *which*
fields get edited through the UI). Flagging rather than fixing — closing
it properly needs column-level privileges or a dedicated
`complete_onboarding_task()` RPC, which is a disproportionate change for
the actual risk here.

---

## 3. What was checked and came back clean

- **RLS coverage:** every one of ~95 public tables has RLS enabled and at
  least one policy — no silently-unprotected table, no accidental deny-all.
- **Cross-tenant isolation:** every write policy across the schema
  references `auth_company_id()`/`auth_is_platform_admin()`/
  `auth_employee_id()` except 5 — all 5 individually verified safe
  (self-scoped by `user_id = auth.uid()` or `id = auth.uid()`, a public
  reference table, or an intentionally-open public contact-form insert).
- **RBAC core** (`roles`/`role_permissions`/`user_roles`): every write
  requires `settings:manage` *and* stays inside the caller's own company —
  no self-escalation path.
- **`profiles` privilege-escalation guard:** a dedicated trigger
  (`prevent_privilege_self_escalation`) blocks a non-platform-admin from
  ever changing `is_platform_admin`, and blocks setting `company_id` to
  join an *existing* populated company except through the real
  invite/link RPCs — verified by reading the trigger body, not just its name.
- **`SECURITY DEFINER` hygiene:** 100% of `SECURITY DEFINER` functions in
  `public` have `search_path` pinned — zero schema-injection exposure.
- **Storage buckets:** all 6 (`documents`, `resumes`, `attendance-photos`,
  `avatars`, `announcement-attachments`, `course-materials`) correctly
  path-scoped to `company_id` with sensible per-bucket permission gates;
  `avatars` being public is intentional and standard (public profile
  images), not an oversight.
- **Self-serve signup/invite flow** (`create_company_and_claim_admin`,
  `accept_invite`, `get_invite_by_token`): a signup can only ever admin a
  *brand-new* company it just created; invite acceptance verifies the
  caller's own profile email matches the invite before granting access.
- **Frontend:** no `dangerouslySetInnerHTML` anywhere in the codebase;
  Supabase client uses only the public anon key (`VITE_SUPABASE_ANON_KEY`),
  never a service-role key; `.env*` correctly gitignored.
- **`clickup-sync`, `rank-candidates`, `embed-document`,
  `generate-support-draft`:** all correctly authenticated (internal-secret
  or real-JWT-via-`auth.getUser()`), all company-scoped, no injection
  risk found.
- **Leave balance logic** (`apply_leave_request` trigger): approval
  deducts balance and writes `on_leave` attendance rows exactly once per
  transition into `approved` (no double-deduction on repeated saves);
  reversal restores balance floored at zero and cleans up the attendance
  rows. Correctly feeds payroll's unpaid-leave day count.
- **Attendance metrics** (`calculate_attendance_metrics` trigger):
  timezone-correct shift-boundary math (including overnight shifts),
  correct grace-period handling for lateness, correct holiday/weekend
  precedence in status derivation. One minor, non-bug limitation: late/
  early-departure minutes only compute once both check-in *and* check-out
  are present, so a still-clocked-in late arrival won't show as "late" on
  the roster until they clock out.
- **Second pass (4 Sep 2026) — every write policy on all ~97 tables**,
  re-checked for a company-scope + (permission check or self-scope)
  shape. The only gaps found are §1.6–1.9 (fixed) and §2.2 (flagged,
  low severity); everything else — including the newer Surveys, LMS,
  Company Events, Salary Bands, and ClickUp-integration tables — already
  followed the established pattern correctly, including deliberately
  anonymous `survey_responses` (no employee-identifying column exists on
  the table at all, so nothing to spoof) and the intentionally
  company-wide (not per-employee) `support_threads` design, confirmed by
  reading `SupportChat.tsx` — a company shares one running support
  conversation with PeopleBind, so any employee updating its status is
  by design, not a gap.
- **`clickup-sync` Edge Function** (live since the first pass, now with a
  real connected workspace): read the full deployed source. Every action
  branch resolves `companyId` from one of the two trusted paths (Vault
  secret for the cron path, `auth.getUser()` + `auth_has_permission`
  for the admin path) *before* any action runs — no action bypasses
  this. The `create_tasks` (push-to-ClickUp) action, added since the
  original plan, is correctly restricted to the admin-JWT path only.
- **`convert_candidate_to_employee`**: authorization-gated
  (`employee:create`), blocks converting the same application twice,
  requires a real accepted offer to exist first. No gap found.
- **`calculate_employee_settlement`**: authorization-gated (`payroll:run`
  or `payroll:approve`), correctly re-derives gratuity/leave-encashment/
  loan-recovery from live data on every recalculation of a still-`draft`
  settlement rather than accumulating; doesn't touch or duplicate regular
  payroll (settlement is end-of-service benefits only, the final period's
  ordinary salary still runs through the now-correctly-prorated normal
  payroll run). No gap found beyond §1.9.
- **`salary_bands`**: new table (0 rows, unused so far), gated on a
  `salary:view`/`salary:edit` permission pair — confirmed those
  permissions actually exist and are granted to `company_admin`/
  `Administrator` by default, so the feature isn't silently unusable.

---

## 4. Not covered in this pass

The two passes together cover tenant isolation/RBAC/edge-function auth
across every table and edge function, the four highest-stakes calculation
engines (payroll, leave, attendance, employee settlements), Recruitment's
conversion step, and the ClickUp integration. Still **not** given a
line-by-line logic review: Documents/Assets business rules (expiry
reminders, asset assignment/return correctness), Reports
(`reportCatalog.js`), the newer Dashboards metric formulas beyond the RLS
layer (turnover/retention/time-to-hire math itself, not just who can write
to the tables), LMS course/lesson/enrollment completion tracking, and
Surveys' eNPS scoring logic. Worth a follow-up pass, or tell me which
module to go deep on next.
