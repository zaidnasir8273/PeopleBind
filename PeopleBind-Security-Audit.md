# PeopleBind — Security Audit & Module Logic Review

*3 Sep 2026, ahead of onboarding real clients. Covers RLS/tenant isolation,
RBAC, storage, all 6 edge functions, frontend security patterns, and the
core payroll/leave/attendance calculation engines. Every finding below was
confirmed by reading the actual deployed function/policy — nothing here is
inferred.*

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

---

## 2. Findings not yet fixed — for you to prioritize

### 2.1 Performance advisors, not urgent now

`get_advisors(type: performance)` flagged 32 `auth_rls_initplan` (RLS
policies calling `auth.uid()`/helpers without wrapping in `(select ...)`,
so Postgres re-evaluates per-row instead of once per query) and 305
`multiple_permissive_policies`. Neither is wrong, both add planner
overhead that will matter more at real client scale than today's handful
of rows. Worth a dedicated pass before heavy usage, not before launch.

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

---

## 4. Not covered in this pass

This audit went deep on tenant isolation/RBAC/edge-function auth
(the core "can Company A ever see Company B's data" question) and on the
three highest-stakes calculation engines (payroll, leave, attendance). It
did **not** do a line-by-line logic review of every module — Recruitment
pipeline stages, Performance review cycles, Onboarding task sequencing,
Documents/Assets, Timesheets/ClickUp sync, Reports, Dashboards, and the
LMS/Surveys/geofencing features shipped this session were not re-audited
individually beyond what their own build already verified. Worth a
follow-up pass, or tell me which module to go deep on next.
