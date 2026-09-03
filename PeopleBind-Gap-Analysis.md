# PeopleBind — Gap Analysis & Competitive Value Map

*Originally prepared from a live backend-only inspection on 22 Aug 2026.
**Rewritten 3 Sep 2026** after a full re-verification against the live
Supabase backend *and* the actual frontend source (`src/`) — the original
version was backend-only and, as of this rewrite, badly out of date: most
of what it flagged as "missing" had already been built in the two weeks
between the two inspections. Every status below was confirmed by reading
the actual function body, table, or component in question — not inferred,
not carried over from the old version.*

---

## 0. What changed since 22 Aug

The original doc's own scope note said "frontend = inferred, not
confirmed." That gap is what made it stale — several P0/P1/P2/P3 items
were assumed missing because no *database* table/function matched, when
the real implementation was frontend-only (a report, an import drawer, a
client-side export) reading data that already existed. This rewrite
checked both layers for everything below.

**Net result: P0 compliance is fully built. P1 security is fully resolved
except one dashboard toggle. Most of P2 and P3 are further along than the
original doc credited.** The real remaining gap list is short — see §4.

---

## 1. Where PeopleBind actually stands

Still broad, and now broader than the Aug 22 snapshot — new since then
include a full payroll-compliance layer (see §2) and, from this session, a
salary-bands/compa-ratio feature, an AI recommendations/trend layer, and
RAG-based policy search with citations (see [docs/ai-assistant.md](docs/ai-assistant.md)
for the full AI reference).

- **Core HR:** companies, branches, departments, designations, employment
  types, employees, employment history, documents, assets
- **Attendance & time:** attendance, corrections, overtime, shifts,
  shift-assignment history, holidays, web + biometric-import clock-in/out
- **Leave:** types, policies (with minimum-notice enforcement), balances,
  requests
- **Payroll — the full compliance stack:** components, per-employee salary
  components, tax slabs, **professional tax slabs**, statutory rates
  (EOBI + **SESSI/PESSI/KPESSI/BESSI + Provident Fund**), loans +
  installments, payroll periods/runs/items, **employer-side statutory
  contributions**, a calculation engine, a finalizer, a pre-run exceptions
  checker, **salary bands + compa-ratio**, and a **Full & Final Settlement
  engine** (gratuity + leave encashment + notice pay − loan recovery)
- **Expenses:** categories, claims
- **Recruitment (full ATS):** job openings, candidates, applications,
  interviews, offers, candidate-to-employee conversion
- **Performance:** review cycles, goals, reviews, feedback notes
- **Onboarding:** templates, template tasks, task instances
- **Engagement:** teams, announcements, kudos, org chart
- **Benefits:** benefit types + a real per-employee enrollment workflow
- **Professional Services / billing:** projects, clients, project members,
  timesheet tasks, time entries, timesheets, running timers, **ClickUp
  time-entry sync**
- **AI:** 32-tool assistant covering data Q&A, policy search (RAG,
  citations), cross-domain business recommendations, historical metric
  trends, and staged leave/expense/overtime decisions — see
  [docs/ai-assistant.md](docs/ai-assistant.md)
- **Platform:** roles, permissions, audit log, realtime notifications, in-app
  support desk, custom dashboards + widgets, ESS account linking

---

## 2. The competitive bar (unchanged from the original — market research, not code)

**Direct competitors:** PayPeople (Bilytica), WebHR, Resourceinn, SmartHCM
(NetSol), FlowHCM, Decibel 360, ClickHCM, MyHRSuite. Enterprise fringe:
Oracle. Regional: Jisr (KSA).

**What decides purchases in PK 2026, per the buyer's guides:**
1. Compliance: EOBI + provincial social security + FBR tax slabs, PF,
   professional tax, gratuity — **all now built here, see §3.**
2. Bank salary-transfer files.
3. Biometric attendance.
4. Employee self-service + mobile.
5. Genuinely functional AI, not an "AI" badge.
6. Multi-branch payroll consolidation, PKR billing, local support.

---

## 3. Corrected status of every item from the original doc

### P0 — Compliance table-stakes: **fully built**

| Item | Status | Evidence |
|---|---|---|
| Provincial social security (SESSI/PESSI/KPESSI/BESSI) | ✅ | `statutory_rates` rate types + `payroll_employer_contributions` table; wired into `run_payroll_calculation` |
| Provident Fund | ✅ | Same mechanism, contribution base = basic salary |
| Gratuity | ✅ | `companies.gratuity_days_per_year`/`gratuity_min_years`, accrual formula in `calculate_employee_settlement` |
| Professional Tax | ✅ | `professional_tax_slabs` table, `calculate_professional_tax()`, Settings UI |
| Full & Final Settlement | ✅ | `employee_settlements` table, `calculate_employee_settlement()` + `finalize_employee_settlement()`, real UI on the employee page ("Finalize & mark Terminated") |
| Bank salary-transfer file export | ✅ | `exportBankFile()` in `Payroll.jsx` — generic CSV (name, bank, account, IBAN, net pay), shown once a run is finalized |
| Statutory report/return exports | ✅ | `Reports.jsx`: EOBI, FBR Monthly Withholding Statement, Tax Certificate, SESSI/PESSI/KPESSI/BESSI, Provident Fund reports, each with a working CSV export |
| EOBI as fixed amount on minimum wage (not %) | ✅ | `companies.eobi_minimum_wage_base`, computed correctly in the payroll engine |
| Medical allowance 10%-of-basic tax exemption | ✅ | Applied in `run_payroll_calculation` |

**One caveat that still stands, deliberately not resolved:** the bank
file and the statutory reports export *generically formatted* CSVs with
the right numbers — nobody has verified their exact column layout against
a specific bank's proprietary bulk-payment spec or FBR/EOBI's precise
prescribed form. Those specs aren't publicly published (confirmed by web
search — every Pakistani bank advertises the service, none publish the
technical format); getting one requires your own corporate banking
relationship manager or the regulator's own current form. Treat the
current exports as "right data, unverified exact layout" until then.

### P1 — Security: **resolved except one toggle**

| Item | Status |
|---|---|
| `v_headcount_by_department` SECURITY DEFINER view (cross-tenant-leak shape) | ✅ Fixed — confirmed `security_invoker: true` |
| `platform_delete_company` anon-reachability concern | ✅ Safe — gates on `auth_is_platform_admin()` internally |
| Trigger functions exposed as callable RPCs | ✅ Fixed — no longer hold `anon`/`authenticated` execute grants |
| Payroll functions' internal permission gating | ✅ Confirmed — `run_payroll_calculation`/`finalize_payroll_run`/`get_payroll_exceptions` all check `payroll:run`/`payroll:approve` |
| Leaked-password protection | ⚠️ Still off — one Supabase Auth-dashboard toggle, not fixable via migration |

### P1 — Market-reality features: **3 of 4 built**

| Item | Status |
|---|---|
| Biometric attendance (CSV/device import) | ✅ `ImportAttendanceDrawer.jsx` — explicit "upload from your biometric device" flow |
| Document-expiry alerts | ✅ `Documents.tsx` — 30-day "expiring soon" banner off `expiry_date` |
| Mobile-first ESS (geo-tag + selfie clock-in) | ✅ Capture already existed (`AttendanceClock.jsx` + `employee_clock_in/out`); 3 Sep 2026 added the missing half — HR-visible verification (location link + photo on the Attendance admin page) and opt-in per-branch geofencing (`branches.office_lat/lng/geofence_radius_m`, `companies.geofence_enforcement`: off/flag/block) |
| Notification delivery beyond in-app/email (WhatsApp/SMS) | ❌ Still missing — email exists (`send-email` edge function, used for payslips); no WhatsApp/SMS |

### P2 — Differentiation / functional AI: **fully built**

| Item | Status |
|---|---|
| Payroll anomaly detection | ✅ |
| Attendance anomaly detection | ✅ |
| Automated leave-policy compliance checks | ✅ `policy_flags` on pending leave requests |
| Predictive attrition signals | ✅ |
| NL "ask your HR data" assistant in the Command Palette | ✅ confirmed — `⌘K` falls through to "Ask PeopleBind AI" |
| Resume screening / candidate ranking | ✅ `rank-candidates` edge function — sends each active candidate's actual resume PDF (Claude's native document support, not a text-extraction hack) + the job description to Claude, returns a ranked draft assessment. "Rank candidates" button on a job opening's pipeline page, `recruitment:manage`-gated via RLS. Not documented in `docs/ai-assistant.md` since it's a separate edge function from `ai-assistant`, not one of its 32 tools. |
| *(beyond the original list)* Policy search with real citations, cross-domain business recommendations, historical metric trend comparisons, salary bands/compa-ratio | ✅ all shipped this session — see [docs/ai-assistant.md](docs/ai-assistant.md) |

### P3 — Optional: **fully built**

| Item | Status |
|---|---|
| Benefits enrollment workflow | ✅ Real per-employee `BenefitsTab`, not just raw tables |
| Org-chart visualization | ✅ |
| Learning & training (LMS) | ✅ `courses`/`course_lessons`/`course_enrollments` + `Learning.jsx` (3 Sep 2026) — catalog, admin course/lesson builder, self-enroll + admin-assign, completion tracking |
| Engagement surveys / eNPS | ✅ `surveys`/`survey_responses`/`survey_receipts` + `Surveys.jsx` (3 Sep 2026) — anonymous responses, standard eNPS formula |

---

## 4. What's actually left (the real gap list)

1. **WhatsApp/SMS notification delivery** — payslips/approvals currently
   only go in-app or by email. On hold: needs a Twilio (or equivalent)
   account with real, billed usage — user's call on provider and timing.
2. **Flip leaked-password-protection on** — a Supabase Auth dashboard
   setting, not a code change. On hold: requires the paid Supabase tier.
3. **Bank-file / statutory-report exact-format verification** — not a
   build task until a real bank spec or the regulator's current form is
   in hand (see the P0 caveat above).

Everything else from the original doc's P0–P3 lists — including LMS,
engagement surveys/eNPS, mobile geo-tag/selfie clock-in verification +
geofencing, and resume screening/candidate ranking — is done; see §3.
The 3 items above are the only ones still open, and all three are
blocked on something outside a code change (a provider decision +
billed usage, a paid plan, or an external spec), not on more building.

---

## 5. Extra value already provided (differentiators — updated)

Everything from the original list still holds, plus what's shipped since:

1. **Billable project time-tracking + client management**, now with
   **ClickUp time-entry sync** — still no mainstream Pakistani HR
   competitor bundles this.
2. **Custom dashboard builder** — local incumbents ship fixed dashboards.
3. **Modern, fast UX** — Command Palette, realtime notifications, drawers,
   toasts, micro-interactions.
4. **A genuinely complete payroll-compliance stack** (§3, P0) — this is
   now parity with, not behind, the incumbents' headline pitch.
5. **A real functional-AI suite**, not an "AI" badge: policy Q&A grounded
   in your own documentation with real citations, cross-domain business
   recommendations that explain their own reasoning, historical trend
   comparisons, plus the pre-existing anomaly detection and attrition
   signals — this is the exact axis the 2026 buyer's guides say decides
   deals, and it's real, inspectable, working code, not marketing.
6. **Salary bands + compa-ratio** — compensation-equity tooling most
   local rivals don't offer at all.
7. **Deep audit trail**, **built-in support desk**, **clean ESS**,
   **engagement layer** (kudos, announcements, org chart) — unchanged
   from the original assessment.

---

## 6. Strategic recommendation (updated)

The original sequencing was "P0 compliance → P1 security → P2 AI, in that
order, because nicer UX doesn't matter if you're disqualified on
compliance." **That sequencing is now complete** — P0 and P1 are done.

**What's left is narrower and lower-stakes than a launch blocker, and
all three remaining items are blocked on something outside a code
change** (a provider decision + billed usage for WhatsApp/SMS, the
paid Supabase tier for leaked-password protection, a real external
spec for bank/statutory file formats) — not on more building. None of
these gate a deal the way SESSI or a cross-tenant RLS leak would have.

**One-line pitch vs PayPeople, updated:** *"Full Pakistani payroll
compliance — EOBI, all four provincial social security schemes,
Provident Fund, professional tax, gratuity, and Full & Final Settlement —
plus billable project tracking, a dashboard you build yourself, and AI
that actually reasons over your real HR data with citations you can
click through, not a chatbot wearing an 'AI' badge."*

---

## 7. Immediate next actions

- [ ] Decide on a WhatsApp/SMS provider (Twilio is the default suggestion) and open a real account when ready to pursue delivery beyond in-app/email
- [ ] Flip leaked-password-protection on in the Supabase Auth dashboard once on a paid plan (2 minutes, no code)
- [ ] If pursuing a specific bank's exact disbursement-file format: get that bank's spec from your corporate relationship manager and hand it over — don't build against a guess
- [ ] Same for statutory report exact formats: pull the current EOBI/FBR/provincial prescribed form if byte-exact compliance output matters before those are relied on for a real filing
