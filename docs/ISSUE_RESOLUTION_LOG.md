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
| AX-FIN-024 | `24`, buyer UID `341355`, recipient UID `411613`, indirect/L2 commission, Pro pool `54`, admin settlement `30` | Current DB confirms 24 distributed + 30 admin settlement = 54; event-time rate/algorithm remains unverified | **PENDING VERIFICATION — LIVE DB PARTIALLY VERIFIED 2026-10-11** | Do not move/refund/debit the 24; establish the event-time rule before any correction |
| AX-DOC-BASELINE | plan allocation, `5/8/30`, `5/7/9`, direct commission | Financial baseline created; several live implementation items still need verification | **OPEN / VERIFICATION BACKLOG** | Follow Section 11 in `FINANCIAL_RULES_AND_ALLOCATION.md`; do not assume target rules are live rules |

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

**Status:** **PENDING VERIFICATION — LIVE DATABASE PARTIALLY VERIFIED 2026-10-11**

- **Search terms:** `24`, `Rs. 24`, buyer public UID `341355`, commission recipient public UID `411613`, indirect commission, L2, Pro pool `54`, admin settlement `30`, purchase ID `cb592147-7ce5-4978-ae28-542a12b13a05`, historical rate.
- **Verified purchase:** The Pro purchase is PKR 900, approved at `2026-10-09 14:01:08 UTC`, purchase/deposit ID `cb592147-7ce5-4978-ae28-542a12b13a05`.
- **Verified commission row:** Recipient UID `411613` received one completed PKR 24 Level-2 commission. Its source is `approved_plan_purchase_indirect`, stored `percentage=100`, and wallet transaction metadata labels it `commission_source=indirect_normalized` with `indirect_pool=24`. There is no reversal row for this commission.
- **Verified current pool/settlement:** The current `purchase_allocations` row records indirect pool **PKR 54**, distributed **PKR 24**. `indirect_pool_admin_settlements` has one settlement for the same purchase of **PKR 30**, and matching admin wallet/ledger entries exist. Therefore the current pool is arithmetically reconciled: 24 + 30 = 54. This proves the current recorded split, not that the original rate was correct.
- **Historical evidence and uncertainty:** The purchase-time `PLAN_PURCHASE_APPROVED` audit snapshot (Oct 9) records the original indirect pool as **PKR 24** and one eligible recipient receiving the full 24. The pool was restored/reconciled to PKR 54 by an audit event on **Oct 10 at 07:27:54 UTC**; the L2–L6 rate table's current rows were last updated **Oct 10 at 07:43:18 UTC**, after the purchase. Current rates are L2 33.3333%, L3 25%, L4 16.6667%, L5 12.5%, L6 12.5%. On a PKR 54 pool, today's L2 weight would yield PKR 18; on the original PKR 24 pool it would yield PKR 8. However, the purchase-time row stores 100% and the original audit shows a different distribution path. The current rate table cannot establish the historical rule that applied on Oct 9.
- **Current conclusion:** PKR 24 + PKR 30 is fully accounted for in current records, but the event-time rule/algorithm remains unverified. The 24 commission may reflect the old normalization method; do not assume either that it was correct or that it was an overpayment.
- **Do not do this yet:** Do not debit/refund PKR 6 or PKR 16, reverse the PKR 24, change the PKR 30 admin settlement, or rerun distribution. The original purchase was Oct 9; the pool/rate changes occurred Oct 10.
- **Remaining investigation:** Find the deployed code/SQL migration and rate configuration active on Oct 9 (before the Oct 10 pool/rate changes), then compare the old distribution rule with the recorded commission. Preserve the current settlement's idempotency; the settlement function explicitly returns `already_settled` after a settlement exists.
- **Completion rule:** Mark **RESOLVED** only when event-time configuration/code or equivalent audit evidence establishes the approved L2 calculation. Until then, keep pending. If the historic rule cannot be recovered, record that limitation and obtain an explicit business decision before any compensating entry.

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
| 2026-10-11 | Read-only verification against active Supabase project: confirmed the single PKR 27 reserve debit, budget net PKR 549, and no member-wallet debit; confirmed PKR 24 indirect commission + PKR 30 admin settlement = PKR 54, but the event-time rate remains unverified. Clarified buyer UID versus commission recipient UID. | PKR 27: resolved and live DB corroborated. PKR 24: pending historical rule/code verification. No data changed by the verification queries. |
