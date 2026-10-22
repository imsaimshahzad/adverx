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
| AX-FIN-027 | `27`, buyer UID `341355`, referrer UID `622644`, reward budget `522`, `549`, purchase `cb592147-7ce5-4978-ae28-542a12b13a05` | PKR 27 commission overpayment was reserve-funded; buyer's reward budget reconciled 522→549 | **RESOLVED — LIVE DB VERIFIED 2026-10-11** | Do not repeat reserve debit or reward-budget reconciliation; do not debit either member wallet |
| AX-FIN-024 | `24`, buyer UID `341355`, recipient UID `411613`, indirect/L2 commission, purchase `cb592147-7ce5-4978-ae28-542a12b13a05`, Pro pool `24 → 54`, admin settlement `30` | The Rs. 24 was paid from the purchase-time Rs. 24 Pro pool; later policy raised the pool to Rs. 54 and settled the Rs. 30 remainder to admin | **RESOLVED — HISTORICAL RULE VERIFIED 2026-10-11** | No refund, debit, reversal, or re-distribution; preserve the original commission and the one-time Rs. 30 settlement |
| AX-DOC-BASELINE | plan allocation, `5/8/30`, `5/7/9`, direct commission | Financial baseline created; several live implementation items still need verification | **OPEN / VERIFICATION BACKLOG** | Follow Section 11 in `FINANCIAL_RULES_AND_ALLOCATION.md`; do not assume target rules are live rules |
| AX-ADMIN-001 | Admin User Details, total earnings, withdrawals + balance | Add a display-only lifetime total using paid withdrawals plus current ledger balance | **IMPLEMENTED IN BRANCH — BUILD/DEPLOY VERIFICATION PENDING** | Verify build, PR merge, and production rendering; do not treat this display metric as a ledger/accounting change |

---

## AX-FIN-027 — PKR 27 reward-budget / reserve adjustment

**Status:** **RESOLVED — LIVE DATABASE VERIFIED 2026-10-11** (read-only verification; no new financial entries written)

- **Search terms:** `27`, `Rs. 27`, buyer public UID `341355`, commission recipient/referrer public UID `622644`, reward budget `522`, `549`, purchase ID `cb592147-7ce5-4978-ae28-542a12b13a05`, reserve adjustment.
- **Important identity clarification:** UID `341355` is the Pro-plan buyer whose reward budget was reconciled. The **PKR 162 direct commission was paid to referrer UID `622644`**, whose active plan was Growth. The approved policy rate recorded in the audit is 15%, so the expected direct commission was PKR 135; the actual completed payment was PKR 162, a PKR 27 overpayment.
- **Verified reserve correction:** `recovery_fund_ledger` contains one PKR 27 `debit` row for the purchase, with note that the difference was absorbed by the platform-use reserve. `ledger_entries` contains one `referral_commission_reserve_adjustment` of -PKR 27. The admin wallet history has a matching -PKR 27 `ADMIN_ADJUSTMENT` entry explicitly recording `member_wallet_debit_pkr: 0`. Audit record `audit_issue_resolved` points to the correction entry and says not to apply another adjustment.
- **Verified reward-budget reconciliation:** The buyer's `user_plans` row currently has reward budget and original reserve **PKR 549**. Its remaining reward budget is now **PKR 471.64** (it was PKR 496.29 at the time of the prior audit, so subsequent reward use explains the change). The purchase's reward-budget ledger rows are +552 initial, -30 reversal, and +27 reconciliation = **PKR 549 net**. There is one row for each of those correction types; the original purchase/allocation snapshots remain preserved.
- **Conclusion:** The historic PKR 27 correction is present in the live database and must not be repeated. The original commission stays paid at PKR 162; the reserve absorbs the PKR 27 difference; no member wallet should be debited.
- **Do not do this again:** Do not issue another reserve debit, another +PKR 27 budget reconciliation, or a member-wallet debit. Do not change/delete the original commission, completed withdrawal, or historical purchase snapshot to make reports look different.
- **Reopen only if:** A new query shows one of the correction rows missing/duplicated/reversed, the buyer budget ledger no longer reconciles to PKR 549 net, or a new separate discrepancy appears. Inspect all rows linked to the purchase ID before any action.

## AX-FIN-024 — historical PKR 24 indirect/L2 commission discrepancy

**Status:** **RESOLVED — HISTORICAL RULE VERIFIED 2026-10-11** (read-only live DB + migration/audit history; no financial rows changed)

- **Search terms:** `24`, `Rs. 24`, buyer public UID `341355`, commission recipient public UID `411613`, indirect commission, L2, Pro pool `24`, Pro pool `54`, admin settlement `30`, purchase ID `cb592147-7ce5-4978-ae28-542a12b13a05`.
- **Purchase:** Pro plan PKR 900, approved at `2026-10-09 14:01:08 UTC`; purchase ID `cb592147-7ce5-4978-ae28-542a12b13a05`.
- **Purchase-time rule confirmed in Git history:** Migration `20260923015000_align_snapshot_with_indirect_pool.sql` explicitly defines the Pro indirect pool as **PKR 24**. The purchase-time `plan_purchase_snapshot_synced` and `PLAN_PURCHASE_APPROVED` audit records also show `indirect_pool=24`; the latter records one eligible recipient, PKR 24 distributed, and zero unallocated. The commission row is one completed PKR 24 L2 entry for recipient UID `411613`, with `percentage=100` and wallet metadata `commission_source=indirect_normalized`. This matches the event-time pool and the normalized distribution path recorded for that purchase.
- **Later policy change confirmed in Git history:** Migration `20261010130000_restore_indirect_pool_for_all_plans.sql` deliberately raises the Pro pool from PKR 24 to **PKR 54** and updates existing purchase allocations/snapshots. The subsequent migration `20261010170000_settle_undistributed_indirect_pool_to_admin.sql` settles any undistributed remainder to admin once per purchase. Therefore the extra PKR 30 is a later policy/allocation reconciliation, not proof that the original PKR 24 commission was wrong.
- **Current live DB reconciliation:** `purchase_allocations` now shows pool PKR 54 and distributed PKR 24. `indirect_pool_admin_settlements` has exactly one PKR 30 settlement. Matching admin wallet transaction and `platform_profit` ledger entry each record PKR 30. The current split reconciles: **PKR 24 commission + PKR 30 admin settlement = PKR 54 pool**.
- **Why current L2 rates do not change this historical result:** The L2–L6 rate rows were updated on Oct 10, after this purchase. Applying today's percentage to the old purchase would ignore the purchase-time pool and the later documented migration. Future purchases should use the active distributor and current L2–L6 rates; this historical purchase remains governed by its recorded event-time allocation plus the explicit later settlement.
- **Final decision:** This is **not a confirmed commission overpayment**. It is a valid PKR 24 payout from the original PKR 24 pool, followed by a later pool increase and a one-time PKR 30 admin settlement. No financial correction is needed.
- **Do not do this again:** Do not refund/debit PKR 6 or PKR 16, reverse the PKR 24 commission, rerun distribution, or alter the PKR 30 admin settlement. Do not create a second settlement. The current settlement function is idempotent and returns `already_settled` when a settlement already exists.
- **Reopen only if:** The original purchase-time audit snapshot is proven incorrect, the PKR 30 settlement is missing/duplicated/reversed, or new evidence shows the migration/backfill did not run as documented. Query all rows for this purchase ID before taking any financial action.

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

## AX-ADMIN-001 — Admin User Details lifetime total

**Status:** IMPLEMENTED IN BRANCH — BUILD/DEPLOY VERIFICATION PENDING

- **First reported:** 2026-10-22
- **Last reviewed:** 2026-10-22
- **Search terms:** Admin User Details; Total Earnings; paid withdrawals; available balance; lifetime total.
- **Affected layer:** Admin UI/reporting only.
- **Observed symptom:** User Details showed Balance, Invested, Deposits, Withdrawals, and Commission separately, but no lifetime total.
- **Expected behavior / approved display formula:** Total Earnings = paid withdrawals + current available ledger balance.
- **Source audit:** `getUserDetails()` in `src/lib/admin-service.ts` derives `summary.withdrawals` from withdrawals with status `paid`, and derives `summary.balance` from qualifying ledger entries while treating withdrawal entries as debits. `UserDetailPage` in `src/routes/admin.tsx` renders the summary cards.
- **Resolution/action taken:** Add a Total Earnings card displaying `Number(summary.withdrawals ?? 0) + Number(summary.balance ?? 0)`, with the formula visible as helper text. No ledger rows, balances, RPCs, database schema, commission calculations, or withdrawal logic are changed.
- **Financial impact:** None; display-only.
- **Duplicate-correction guard:** Do not create or modify any financial entry to implement this display.
- **Tests/reconciliation performed:** Source-level formula audit only. Build, CI, merge, and production verification remain pending until evidenced.
- **Commit / PR / migration / RPC reference:** Branch `fix/admin-user-total-earnings`; PR pending.
- **Remaining uncertainty:** This metric follows the specifically requested formula; it is not an independent accounting reconciliation and should not be represented as a ledger-verified profit figure.
- **Next action / owner:** Run lint/build checks, inspect the PR diff, merge if checks pass, and verify Vercel production deployment.
- **Status-change history:**
  - 2026-10-22 — OPEN — missing UI total reported.
  - 2026-10-22 — IMPLEMENTED IN BRANCH — reporting-only card added; validation and deployment pending.

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
| 2026-10-11 | Read-only verification against active Supabase project: confirmed the single PKR 27 reserve debit, budget net PKR 549, and no member-wallet debit; confirmed PKR 24 indirect commission + PKR 30 admin settlement = PKR 54, and initially left the event-time rate pending. Clarified buyer UID versus commission recipient UID. | No data changed by the verification queries. |
| 2026-10-11 | Closed AX-FIN-024 after matching the Oct 9 purchase-time audit snapshot to the Sep 23 migration (Pro pool PKR 24), then matching the Oct 10 pool expansion migration (PKR 54) and one-time PKR 30 admin settlement to the live ledger. | AX-FIN-024 resolved; no commission reversal/refund or additional settlement needed. Read-only verification only. |
