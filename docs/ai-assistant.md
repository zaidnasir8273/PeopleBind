# PeopleBind AI — Feature Reference

This is the reference doc for "PeopleBind AI," the chat assistant embedded in the
product (topbar popover — [`AiAssistant.tsx`](../src/components/AiAssistant.tsx) —
and the full-page version at [`AiChat.tsx`](../src/pages/AiChat.tsx), both driven
by the shared [`useAiChat.ts`](../src/hooks/useAiChat.ts) hook).

**Read this before changing the assistant.** It exists because the backend that
does the actual work — the `ai-assistant` Supabase Edge Function — is **not
tracked in git** (like every edge function in this project). This file, plus
whatever the Supabase dashboard shows for the function today, are the only
places its behavior is recorded. If you change it, update this doc in the same
change.

---

## 1. How it's built

- **Model:** `claude-haiku-4-5-20251001`, called directly via the Anthropic
  Messages API (not the Supabase AI integration).
- **Auth:** the edge function builds its Supabase client from the *caller's own
  JWT* (`Authorization` header), never the service-role key. Every tool call
  below is therefore subject to the exact same RLS policies as if the user had
  queried that table from the browser themselves — the assistant has no more
  access than the person chatting with it.
- **`company_id`** is always supplied by the frontend from `useAuth().company.id`
  (never something the model can set) — this closes tenant isolation at the
  tool-schema level, on top of RLS itself.
- **Tool-calling loop:** up to 4 rounds (`MAX_TOOL_ITERATIONS`) — the model can
  call several tools, see the results, and call more before writing its final
  answer.
- **Rate limit:** 30 user messages/hour per user (`RATE_LIMIT_MAX_MESSAGES`),
  a floor against runaway usage, not a billing system.
- **Two request shapes:**
  - `{ conversation_id, message, company_id }` — a normal chat turn.
  - `{ action_id, confirm, company_id }` — a Confirm/Cancel button click. This
    is the *only* path that ever actually mutates data (see §3.7) and is only
    ever reachable from a real click in the UI, never from anything typed in
    chat.
- **Logging:** every turn writes to `ai_audit_log` (tools requested/executed,
  latency, success/error) and every message to `ai_messages` (`role`,
  `content`, `tool_calls`, `sources`).

### Updating the deployed function

Since it isn't in git, there's no PR to review — the workflow is: pull the
live source with the Supabase MCP `get_edge_function` tool, edit it, redeploy
with `deploy_edge_function`, then fetch it back and diff byte-for-byte against
what you intended to ship. Never trust that a deploy call "probably worked" —
verify it.

---

## 2. Tool catalog

32 tools today, grouped by what they cover. Every tool that takes a date range
uses `from`/`to` as `YYYY-MM-DD`.

### Company & people
`getCompanySummary`, `getDepartments`, `getEmployeeCount`, `searchEmployees`
(name/code only — never salary, CNIC, or bank details), `getDepartmentEmployees`,
`getNewHires`.

### Attendance & leave
`getAttendanceSummary`, `getAttendanceAnomalies` (check-out-before-check-in,
implausible shifts, buddy-punch signals via identical check-in timestamps),
`getAbsenteeismRanking`, `getLateArrivalsRanking`, `getLeaveBalance` (caller's
own balance only), `getLeaveSummary`.

### Payroll
`getPayrollSummary`, `getPayrollAnomalies` (negative net pay, large swings,
missing salary structure/bank details, unreviewed overtime/leave/expenses —
via `get_payroll_exceptions`), `getPayrollByDepartment`, `comparePayrollPeriods`,
`getOvertimeByDepartment`.

### Performance & attrition
`getPerformanceSummary`, `getTurnoverAndRetention` (total/voluntary/
involuntary/**regrettable** turnover — regrettable = voluntary departure whose
last rating was ≥4/5, `REGRETTABLE_RATING_THRESHOLD`), `getAttritionRisk`
(rules-based signals via `get_attrition_risk_signals`: rising absenteeism, pay
stagnation despite tenure, no role change despite tenure, declining rating
trend, elevated department turnover — see §3.2 for the full signal list).

### Cross-domain intelligence (see §3 for deep dives)
`getBusinessRecommendations`, `getMetricTrend`.

### Recruitment
`getRecruitmentPipeline` (stage counts per opening), `getUpcomingInterviews`.

### Policy documentation (RAG — see §3.1)
`searchPolicies`.

### Leave/expense/overtime decisions (see §3.7)
`findPendingLeaveRequests` / `proposeLeaveDecision`,
`findPendingExpenseClaims` / `proposeExpenseDecision`,
`findPendingOvertimeRecords` / `proposeOvertimeDecision`.

---

## 3. Deep dives

### 3.1 Policy search (RAG)

`searchPolicies` is the one tool that does real retrieval-augmented
generation — everything else above is direct structured querying, not RAG.

**Ingestion** ([`embed-document`](../supabase functions, not in git) function,
triggered by a DB trigger on `help_articles` publish/edit):
- Splits an article's body into paragraph-packed chunks (2000-char budget,
  ~150-char overlap across a split so a fact at a chunk boundary keeps context
  on both sides).
- Embeds `${title}\n\n${chunk}` (not just the bare paragraph) with OpenAI
  `text-embedding-3-small`, so a mid-document chunk still carries its subject.
  The stored `content` column stays the pure paragraph text — only what's
  *sent to OpenAI* gets the title prefix.
- Stores one row per chunk in `knowledge_chunks` (`document_id`, `company_id`,
  `title`, `content`, `chunk_index`, `embedding`), HNSW-indexed on `embedding`.

**Retrieval** (`searchPolicies`):
1. Embeds the query, matches via `match_help_chunks` RPC (cosine similarity,
   threshold 0.5, top 5).
2. **Always** also runs a keyword search over `help_articles` (word-level,
   stopword-filtered `ilike`) — blended, not either/or, so a short/generic
   query that scores under the similarity threshold can still surface the
   right article via a literal word match.
3. Merges: semantic results first (already ranked), then keyword hits not
   already present, capped at 5 total.
4. If nothing usable comes back from either method, logs the query to
   `policy_search_misses` (best-effort — never blocks the answer). Surfaced
   to admins in **Settings → Payroll... → Company Docs → "Recent unanswered
   questions"** — a direct content-gap signal.

**Citations:** built server-side, not left to the model. The edge function
tracks every `{id, title}` pair returned by any `searchPolicies` call in a
turn, dedupes by id, stores it on the `ai_messages.sources` column, and
returns it in the response. The frontend renders a "Sources: ..." line
linking to `/app/help?article=<id>` (Help.jsx reads that query param). This
guarantees the citations shown are exactly the articles actually used,
regardless of what the model's prose happens to say.

Requires `OPENAI_API_KEY` to be configured for the semantic half; falls back
to keyword-only, gracefully, if it's missing or the API call fails.

### 3.2 Business recommendations

`getBusinessRecommendations(days_back = 30)` → `get_business_recommendations`
SQL function. Combines existing signals into 5 named scenarios, each with a
concrete recommendation — not a new data source, a synthesis layer over ones
that already existed. System-prompt-nudged to fire proactively on broad
questions ("how are we doing", "anything I should know about", "any
concerns") rather than only when asked by name.

| Scenario | Fires when | Recommendation |
|---|---|---|
| `regrettable_attrition_risk` | ≥1 signal from `get_attrition_risk_signals_internal` AND latest rating ≥4/5 | Retention conversation (+ comp review if compa-ratio also <90%) |
| `payroll_outpacing_headcount` | payroll growth % exceeds headcount growth % by ≥5 points, trailing `days_back` vs the prior window | Review overtime/allowance drivers |
| `overtime_performance_risk` | a department's overtime (trailing `days_back`) ≥1.5× the company average AND its avg rating (trailing 90d) is below the company average (dept size ≥3, avoids small-team noise) | Review workload distribution / headcount |
| `pipeline_stalling` | a job opening open ≥45 days (or ≥1.5× your own historical avg fill time) with zero candidates past screening | Review sourcing / the job description |
| `below_band_compensation` | compa-ratio <85% AND rating ≥4/5, and **not already covered by** `regrettable_attrition_risk` (avoids a near-duplicate recommendation for the same person) | Compensation review |

**Permission model — deliberately different from every other signal
function.** `get_attrition_risk_signals`/`get_payroll_exceptions`/etc. each
require *all* their permissions or raise an error outright. A 5-scenario
aggregator can't work that way — a recruitment manager without `salary:view`
should still see `pipeline_stalling`, not get zero rows because of an
unrelated permission. So each scenario's `UNION ALL` branch carries its own
`WHERE` permission filter (`v_can_salary`, `v_can_performance`,
`v_can_payroll`, `v_can_overtime`, `v_can_recruitment` — computed once at the
top of the function), and only a *company mismatch* raises an exception.
Missing one specific permission just silently omits that scenario's rows —
the same graceful degrade RLS already does everywhere else.

### 3.3 Metric trends & daily snapshots

Two pieces, shipped together:

**`snapshot_company_metrics()`** — a `pg_cron` job (`company-metrics-daily-
snapshot`, `0 19 * * *`, right after the existing `auto_mark_daily_attendance`
job at 15:00) that loops every company and upserts 7 curated KPIs into
`company_metric_snapshots` (one row per company/day/metric — narrow/EAV shape
so new metrics don't need a schema migration later):

| `metric_key` | window | source |
|---|---|---|
| `headcount` | point-in-time | same as the `headcount` dashboard metric |
| `turnover_rate_30d` | rolling 30d | same formula as `turnover_rate` |
| `avg_overtime_hours_30d` | rolling 30d | overtime hours ÷ active headcount |
| `avg_performance_rating_90d` | rolling 90d | same window as `overtime_performance_risk` |
| `gross_payroll_30d` | rolling 30d | same as `getPayrollSummary`'s gross figure |
| `avg_compa_ratio` | point-in-time | company-wide avg of the `compa_ratio` metric — row simply **omitted** (not zeroed) when no bands are configured |
| `absenteeism_rate_30d` | rolling 30d | % attendance days marked absent/late |

Idempotent (`ON CONFLICT ... DO UPDATE`) — safe to re-run for the same day.

**`getMetricTrend(metric, period1_from, period1_to, period2_from, period2_to)`**
reads that table (plain RLS-scoped `select`, no RPC needed) and returns each
period's average plus `change_percent` — same shape as the existing
`comparePayrollPeriods` tool. If either period has zero snapshot rows, it
returns a `note` saying so explicitly instead of a number — the model is
instructed to relay that plainly rather than guess.

**Known limitation, by design (backfill was explicitly skipped):** the table
only has data from whenever this shipped onward. `headcount` and
`turnover_rate_30d` are reconstructable retroactively from `joining_date`/
`exit_date` if a backfill is ever wanted later; the other five are not (the
inputs to compute a *historical* daily snapshot don't exist after the fact).
Expect "not enough history" answers for anything but very recent periods
until the table has accumulated a few weeks.

**RLS:** `gross_payroll_30d` and `avg_compa_ratio` are salary-sensitive; the
select policy gates *those two `metric_key` values specifically* (via a
per-row `USING` clause, not a blanket table gate) on the same permissions
`employee_salary_components`/`salary_bands` already require. The other five
stay visible to any company member. Writes go only through the
`SECURITY DEFINER` cron function — no insert/update/delete policy exists for
`authenticated`/`anon`.

### 3.4 Salary bands & compa-ratio

Not an AI-only feature — a real Settings page + dashboard metric that the AI
building blocks above (compa-ratio in scenarios 1/5, `avg_compa_ratio`
snapshots) depend on.

- **`salary_bands`** table: `min_salary`/`mid_salary`/`max_salary` per
  designation (`check (min ≤ mid ≤ max)`, unique per designation). RLS gated
  on the real `salary`/`view` (read) and `salary`/`edit` (write) permissions —
  not `settings:manage` — matching `employee_salary_components`'s own shape.
- **Settings → Payroll → Salary bands** ([Settings.jsx](../src/pages/Settings.jsx),
  `SalaryBandsTab`): list + add/edit drawer + inline delete confirm. No
  client-side permission gate (matches this app's established convention —
  shown to everyone, RLS enforces, a rejected write surfaces via toast).
- **`compa_ratio` dashboard metric** ([dashboardMetrics.js](../src/lib/dashboardMetrics.js)):
  average of `basic_salary ÷ matching band's mid_salary × 100` across
  employees who have *both* a `basic_salary` and a banded designation —
  employees missing either are simply excluded, not counted as 0%.

**Data reality worth knowing:** as of this writing your own company has 4
employees with `basic_salary` set and 0 with salary bands configured — the
compa-ratio-dependent scenarios (`below_band_compensation`,
`avg_compa_ratio`) will return nothing until bands are actually filled in.
Not a bug.

### 3.5 Turnover, retention, hiring velocity

`getTurnoverAndRetention` and `getHiringVelocity` — direct dashboard-metric
formulas re-implemented in the edge function (it runs in a separate Deno
runtime with its own Supabase client, not a shared import), not a port with
different math. If you change the turnover/retention formula in
`dashboardMetrics.js`, mirror the change in `ai-assistant.ts`'s
`countEmployeesAsOf`/`countDepartures`/`countRegrettableDepartures` helpers.

### 3.6 Payroll & attendance anomaly detection

`getPayrollAnomalies`/`getAttendanceAnomalies` wrap `get_payroll_exceptions`/
`get_attendance_anomalies` — pre-existing rules-based checks (not new this
cycle), included here because `getBusinessRecommendations` deliberately does
*not* duplicate them — the model is expected to call these directly alongside
the recommendations tool for a genuinely broad question, which is exactly
what happens in practice (see a real example in §5).

### 3.7 Leave/expense/overtime decisions — the propose/confirm safety model

The assistant **never executes a mutation**. For each of leave, expense, and
overtime:

1. A **find** tool (`findPendingLeaveRequests` etc.) locates the specific
   record — never a guessed id. `findPendingLeaveRequests` additionally
   computes `policy_flags` (insufficient notice vs. the matching leave
   policy, or exceeds remaining balance) so violations surface automatically,
   not only when separately asked for.
2. A **propose** tool (`proposeLeaveDecision` etc.) — in the *same turn*,
   mandatory per the system prompt — inserts a row into `ai_actions`
   (`status: 'proposed'`). This is the only thing that produces the
   Confirm/Cancel buttons the user sees; the find tool alone shows nothing.
3. The user clicks **Confirm** or **Cancel** in the UI → a distinct request
   shape (`{action_id, confirm}`, no `message`) → `handleConfirmation()` in
   the edge function. This is the **only** code path that ever actually
   updates `leave_requests`/`expense_claims`/`overtime_records`, and it
   re-validates against *live* data (not the snapshot taken when proposed) —
   someone else may have already acted on it elsewhere in the meantime.

The system prompt is explicit that the model must never describe an
approval/rejection as done, or mention Confirm/Cancel buttons, unless the
propose tool has already returned `{ proposed: true }` in that same turn.

---

## 4. Permission reference

Resources used by AI tools, from the real `permissions` table (not invented
per-feature):

| resource | action | gates |
|---|---|---|
| `salary` | `view` | attrition risk, business recs (attrition + comp scenarios), salary bands read, `gross_payroll_30d`/`avg_compa_ratio` snapshots |
| `salary` | `edit` | salary bands write |
| `performance` | `manage` | attrition risk, business recs (attrition + comp + overtime scenarios) |
| `payroll` | `run` / `approve` | payroll anomalies, business recs (payroll-outpacing-headcount) |
| `overtime` | `approve` | overtime records, business recs (overtime/performance scenario) |
| `recruitment` | `manage` | applications, business recs (pipeline-stalling scenario) |
| `attendance` | `view` | attendance anomalies |
| `settings` | `manage` | Settings tabs generally (not salary bands specifically) |

`job_openings` itself has no permission gate (open to any company member);
only `applications` requires `recruitment:manage`.

---

## 5. Verified behavior (real examples from this build)

These aren't hypotheticals — each was confirmed against real company data
during development:

- **Blended search:** "what's our overtime policy" (no dedicated article
  exists) returned 6 articles via keyword fallback alongside semantic misses,
  with the model correctly saying no specific policy document exists rather
  than inventing one.
- **Business recommendations, live:** asking "anything I should know about"
  produced `tool_calls: ["getBusinessRecommendations", "getPayrollAnomalies",
  "getAttendanceAnomalies", "getAttritionRisk"]` — the new tool fired first
  (per the system-prompt nudge), surfaced a real `regrettable_attrition_risk`
  match, and the model layered in the older granular tools for a genuinely
  complete answer rather than the new tool crowding them out.
- **Below-band compensation:** seeding a test salary band + rating correctly
  produced a `below_band_compensation` recommendation ("compa-ratio 77.8%...
  consider a compensation review") and correctly did *not* also duplicate it
  under `regrettable_attrition_risk` for the same person.

---

## 6. Extending this

**Adding a tool:** add an entry to the `TOOLS` array in `ai-assistant.ts`
(`name`, `description` — this is what the model uses to decide when to call
it, so be as specific about *when to use it* as about *what it returns* —
`input_schema`, `run`). No frontend change needed; the chat UI renders
whatever text comes back from the same edge function regardless of which
tools fired.

**Adding a business-recommendation scenario:** add a `UNION ALL` branch to
`get_business_recommendations`'s query, gated by whichever `v_can_*`
permission flag applies (add a new one if it needs a permission not already
computed at the top of the function). Keep the six-column shape (`scenario,
subject_type, subject_id, subject_label, signal_summary, recommendation`).

**Adding a snapshot metric:** add an `INSERT ... ON CONFLICT DO UPDATE` block
to `snapshot_company_metrics()`, and add the new `metric_key` to
`getMetricTrend`'s `enum` in its `input_schema`. If it's salary-sensitive,
add it to the `company_metric_snapshots_select` RLS policy's exclusion list.

**Redeploying:** see §1's "Updating the deployed function" — always diff the
fetched-back source against what you intended to ship before considering the
change done.
