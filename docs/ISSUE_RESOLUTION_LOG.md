# AdverX Issue & Resolution Log

> **Purpose:** Persistent memory for developers and AI assistants working on AdverX. Search this log before reopening a previously reported problem, proposing a financial correction, or repeating an investigation.
>
> **Last updated:** 2026-10-11
> **Rule:** This log records decisions and evidence; it does not authorize a new money movement. Never reverse, debit, credit, or rewrite a financial record based only on a log entry.

## AI / developer instructions — read first

1. **Read this file before investigating a previously reported issue.** Search by issue ID, amount, public UID, transaction reference, table/RPC name, error text, and synonyms.
2. Match the current report to an existing entry before creating a duplicate. Compare the underlying event, amount, user/reference, date, and symptoms—not just similar wording.
3. If an exact match is **RESOLVED**, do not report it as a new open issue and do not repeat its correction. Say it was previously resolved and identify the recorded evidence. Reopen it only if fresh evidence shows recurrence, the old fix is absent, or the ledger now disagrees.
4. If an entry is **PENDING VERIFICATION**, do not call it fixed or apply another adjustment. Continue only the specific verification listed in the entry.
5. If an entry is **OPEN**, investigate it and append findings. Do not silently change its status.
6. If a previously resolved issue returns, change its status to **REOPENED**, add the new evidence and date, and preserve the old resolution history.
7. For money issues, inspect the authoritative Supabase RPC/database function and the complete ledger trail before acting. Prefer a documented compensating entry over editing/deleting historical entries. Check for an earlier adjustment to prevent double correction.
8. Update this log in the same PR as any financial fix, reversal, refund, ledger correction, RPC/migration change, or admin-reporting change. Include the code commit/PR and test/reconciliation evidence. Do not claim verification that was not performed.
9. Never treat a display-only fix as a financial fix. Clearly separate UI, application logic, database enforcement, ledger/accounting, and production verification.
10. If no previous entry matches, create a new unique ID (for example `AX-2026-001`) and link it from the index below.

## Status definitions

- **RESOLVED** — the specific issue has a documented correction and no further action is currently required. Do not repeat the correction.
- **PENDING VERIFICATION** — a discrepancy or historical event is identified, but the authoritative rule or evidence is not yet confirmed.
- **OPEN** — investigation or fix is still required.
- **REOPENED** — a previously resolved issue has returned with new evidence.
- **WONT FIX / ACCEPTED** — explicitly accepted by the owner, with reason recorded.

## Quick status index

| Issue ID | Search keys | Short description | Status | Required next action |
|---|---|---|---|---|
| AX-FIN-027 | `27`, `341355`, reward budget `522`, `549`, reserve adjustment | PKR 27 difference absorbed by platform-use reserve; historic adjustment recorded | **RESOLVED** | Do not deduct from member wallet or apply the reserve adjustment again; reopen only with contradictory new evidence |
| AX-FIN-024 | `24`, `341355`, indirect/L2 commission, Pro pool `54`, admin settlement `30` | Historical commission split needs the event-time L2 rate verified | **PENDING VERIFICATION** | Trace the original event and historical configuration/RPC before any correction |
| AX-DOC-BASELINE | plan allocation, `5/8/30`, `5/7/9`, direct commission | Financial baseline created; several live implementation items still need verification | **OPEN / VERIFICATION BACKLOG** | Follow Section 11 in `FINANCIAL_RULES_AND_ALLOCATION.md`; do not assume target rules are live rules |

---

## AX-FIN-027 — PKR 27 reward-budget / reserve adjustment

**Status:** **RESOLVED** (based on the recorded prior investigation; reopen only with new contradictory evidence)

- **Search terms:** `27`, `Rs. 27`, public UID `341355`, reward budget `522`, `549`, platform-use reserve, reserve adjustment.
- **Reported discrepancy:** For public UID `341355`, PKR 162 had been recorded where PKR 135 was the correct amount for the relevant commission/reward comparison, leaving a PKR 27 difference.
- **Recorded resolution:** The PKR 27 difference was absorbed by the platform-use reserve. The reward-budget figure was adjusted from **PKR 522 to PKR 549**, and the reserve adjustment was recorded. The original history was preserved; no member-wallet deduction was required.
- **Do not do this again:** Do **not** deduct PKR 27 from the member's wallet. Do not repeat the reserve adjustment, add a second correction, or rewrite/delete the original ledger history simply because the difference appears in a new report or conversation.
- **Evidence / limitation:** This entry is based on the recorded prior investigation and decision. This log entry itself is not a live Supabase query and does not independently prove the current database still contains the adjustment.
- **Reopen only if:** The original reserve adjustment is absent, duplicated, reversed, or the current authoritative ledger shows a new/unexplained difference. If reopened, first inspect all related entries and references and record the new evidence.
- **Verification required before reopening:** Confirm the original PKR 27 adjustment and PKR 522 → PKR 549 budget change in the authoritative records; compare current ledger and reserve summaries without writing any new entry.
- **Resolution history:** Original financial history must remain intact; the documented resolution is a reserve-side adjustment, not a member-wallet debit.

## AX-FIN-024 — historical PKR 24 indirect/L2 commission discrepancy

**Status:** **PENDING VERIFICATION** (not resolved)

- **Search terms:** `24`, `Rs. 24`, public UID `341355`, indirect commission, L2, Pro pool `54`, admin settlement `30`, historical rate.
- **Recorded observation:** A PKR 54 Pro-related pool was recorded as **PKR 24 commission + PKR 30 admin settlement**, which accounts for the full PKR 54 pool arithmetically.
- **Discrepancy:** The currently described L2 rate would imply PKR 18 for the relevant event, not PKR 24. The correct rate/rule at the time of the original event has not yet been established.
- **Current conclusion:** The pool appears fully accounted for in the described split, but the commission-rate correctness remains unverified. Arithmetic reconciliation alone does not prove the allocation was correct.
- **Do not do this yet:** Do not debit the user, refund PKR 6, move the PKR 24, change the admin settlement, or rerun/reverse the commission until the event-time rule and complete ledger chain are confirmed.
- **Required investigation:**
  1. Find the original commission/pool event and all linked ledger/audit entries.
  2. Identify the plan/level/rate configuration and active RPC/code that applied **at the event timestamp**.
  3. Confirm the rate base, rounding, eligibility, and whether PKR 24 was an approved historical rate or an error.
  4. Check whether the admin settlement is a separate allocation, a remainder, or a report-only figure; do not assume its meaning from the label.
  5. Reconcile the total pool exactly once and inspect whether a later correction already exists.
  6. Record the evidence, approved outcome, any compensating-entry reference, and tests here before changing the status.
- **Completion rule:** Mark **RESOLVED** only after the event-time rule and ledger chain are evidenced and the correct outcome is documented. If the historical rate cannot be established, keep this item pending and explain the uncertainty in future audits.

## AX-DOC-BASELINE — baseline-vs-live financial rules

**Status:** **OPEN / VERIFICATION BACKLOG**

See [Financial Rules & Allocation Baseline](FINANCIAL_RULES_AND_ALLOCATION.md).

Items that must not be repeatedly described as newly discovered without checking the baseline:
- Intended task counts `5 / 7 / 9` versus previously observed possible values `5 / 8 / 30`.
- Direct commission rate/base versus sale-level allocation consistency.
- Live plan rows and reward caps.
- Indirect Levels 1–6 rate and unlock conditions.
- Active RPC definitions, grants, RLS and historical ledger/report reconciliation.

These remain verification tasks until evidence is added; documenting a concern does not mean it is fixed.

---

## New issue template

Copy this template for each genuinely new issue. Keep the original entry and resolution history when an issue reopens.

```md
## AX-YYYY-NNN — Short searchable title

**Status:** OPEN

- **First reported:** YYYY-MM-DD
- **Last reviewed:** YYYY-MM-DD
- **Search terms:** exact error text; amount; public UID; transaction/reference ID; RPC/table name.
- **Affected layer:** UI / application / API / Supabase RPC / schema-RLS / ledger / reporting / deployment.
- **Observed symptom:**
- **Expected behavior / approved rule:**
- **Evidence:** links, query results, relevant source lines, screenshots/log references (no secrets).
- **Root cause:** Unknown until proven.
- **Resolution/action taken:**
- **Financial impact:** amount, account/bucket, and affected event; state explicitly if none.
- **Duplicate-correction guard:** what must not be repeated.
- **Tests/reconciliation performed:**
- **Commit / PR / migration / RPC reference:**
- **Remaining uncertainty:**
- **Next action / owner:**
- **Status-change history:**
  - YYYY-MM-DD — OPEN — initial report.
```

## Change history

| Date | Change | Evidence/status |
|---|---|---|
| 2026-10-11 | Created issue/resolution memory; added the recorded PKR 27 resolution and PKR 24 pending verification case. | Historical notes captured; live ledger state not independently re-queried as part of this documentation change. |
