# AdverX Financial Rules, Plan Allocations & Fairness Ledger

> **Document type:** Business-rules baseline and implementation-verification register  
> **Purpose:** Keep plan economics, allocations, referral commissions, reward limits, roles, fund movements, admin scenarios, and fairness checks in one maintained reference.  
> **Last prepared:** 2026-10-11  
> **Scope:** Documentation only. This file does not change application logic, database rows, RPCs, migrations, wallet balances, or production settings.

## 1. How to read this document

This reference separates three kinds of statements:

- **Baseline rule:** a business rule previously specified for AdverX and intended to remain stable unless the owner explicitly approves a change.
- **Code-visible fact:** a fact observed in the current Git source.
- **Needs live verification:** a rule that must be checked against active Supabase plan rows, database functions/RPCs, RLS/grants, ledger entries, and production deployment before calling it implemented.

A value shown in the UI or a TypeScript type is not proof that the database enforces it. If code, database, and this baseline disagree, do not silently choose one. Record the discrepancy, investigate existing transactions, and obtain approval before changing money logic.

## 2. Plan catalogue — intended baseline

These are the reference targets previously discussed for Starter, Growth, and Pro. Compare them with active rows in the live plans table before describing them as current production values.

| Rule | Starter | Growth | Pro |
|---|---:|---:|---:|
| Plan price | PKR 300 | PKR 600 | PKR 900 |
| Reward budget target | PKR 100 | PKR 200 | PKR 300 |
| Base ad reward target | PKR 2 | PKR 4 | PKR 6 |
| Maximum reward per ad target | PKR 5 | PKR 8 | PKR 10 |
| Daily reward cap target | PKR 15 | PKR 30 | PKR 40 |
| Ad tasks per day target | 5 | 7 | 9 |
| Direct-referral rate associated with plan | 12% | 15% | 18% |
| Indirect referral eligibility | No | No | Yes; intended Levels 1–6 |
| Ad/reward allocation target | 68% | 65% | 62% |
| Recovery fund target | 8% | 8% | 8% |
| Admin/platform profit target | 12% | 12% | 12% |

**Known verification item:** an earlier review noted a possible task-count mismatch of 5 / 8 / 30 instead of the intended 5 / 7 / 9. Verify the live database and UI; do not assume this has been fixed without evidence.

### Plan fields visible in the current source

The plan loader maps database fields for price, duration, daily task limit, reward budget, base/max ad reward, daily reward limit, referral reward allocation, admin profit percentage, referrer commission percentage, indirect referral percentage, recovery-fund percentage, ad-budget percentage, recovery per referral, minimum withdrawal, and network eligibility. It loads active plan rows from Supabase. These fields existing in client code does not prove that every percentage is enforced by the same financial RPC.

Source references: [deposit-service.ts](../src/lib/deposit-service.ts), [platform-store.tsx](../src/lib/platform-store.tsx), [Plans page](../src/routes/_authenticated.plans.tsx).

## 3. Allocation model and fund flow

### 3.1 Intended high-level allocation

The following table is a planning/reconciliation model based on the target sale allocation percentages. It is not proof that production writes separate ledger entries in this exact form.

| Allocation bucket | Starter sale (PKR 300) | Growth sale (PKR 600) | Pro sale (PKR 900) |
|---|---:|---:|---:|
| Ad/reward budget (68% / 65% / 62%) | 204 | 390 | 558 |
| Recovery fund (8%) | 24 | 48 | 72 |
| Admin/platform profit (12%) | 36 | 72 | 108 |
| Direct-referral allocation target (12% / 15% / 18%) | 36 | 90 | 162 |
| **Total target allocation** | **300** | **600** | **900** |

Confirm the allocation base, exact RPC, rounding rules, handling of missing/ineligible referrers, and whether direct commission uses the purchaser's plan rate or the referrer's active-plan rate. Do not use this table to post manual ledger entries.

### 3.2 Direct referral commission — previously specified formula

The previously specified rule is:

**Direct commission = referred user's plan price × the referrer's eligible active-plan direct rate.**

| Referrer's active plan | 300 plan sale | 600 plan sale | 900 plan sale |
|---|---:|---:|---:|
| Starter (12%) | PKR 36 | PKR 72 | PKR 108 |
| Growth (15%) | PKR 45 | PKR 90 | PKR 135 |
| Pro (18%) | PKR 54 | PKR 108 | PKR 162 |

This matrix and the sale-allocation table use different viewpoints: the matrix applies the **referrer's rate** to the purchased plan price, while the allocation table represents the **target budget split for the sale**. If implementation cannot reconcile both without exceeding sale proceeds, treat that as a business-rule conflict and resolve it before changing code. Never pay both interpretations for the same referral.

### 3.3 Reward pool, reserves, recovery, and unassigned commission

- The recovery-fund target is 8% of the relevant eligible plan-sale amount. Verify whether production records it at purchase time, referral time, or another event.
- The ad/reward budget target is 68% / 65% / 62% by sold plan. Each user's target reward budget is PKR 100 / 200 / 300. Verify the relationship between sale-level allocation, individual budget, issued rewards, and remaining reserve; these are not interchangeable counters.
- A reserve is not a wallet credit. Reserved capacity must not appear as spendable balance until an eligible reward is earned and posted.
- If no eligible referrer exists, do not credit commission to an arbitrary user. The intended handling includes an unassigned-referral bucket/status; confirm the active RPC and report before moving or releasing that amount.
- Prevent double counting between recovery, referral commission, admin profit, reward allocation, and reserve totals. Each rupee must have one traceable accounting destination for a given event.

### 3.4 Private offers and discounts

The prior offer design was private and UID-specific: inbox offer → eligibility check by admin → offer assignment → discounted activation → one-time redemption. Public status must not expose private offer prices.

Previously discussed examples were PKR 300 → 270, PKR 600 → 540, and PKR 900 → 800. The proposed funding source was the applicable direct-referral commission, while platform profit, recovery, and reward allocations remain unchanged. These are historical proposal values, not automatically current live offers. Before activation, verify the offer record, UID eligibility, expiry, one-time-use enforcement, and accounting treatment. Never silently lower reward reserve or platform/recovery allocation to fund a discount.

## 4. Reward earning and fairness rules

1. Reward earning requires a valid eligible plan and a successfully completed, server-validated ad/task flow.
2. A client timer, hidden button, displayed amount, or browser state is not proof that a reward was earned.
3. Per-ad reward must not exceed the configured plan maximum. Daily issued reward must respect the configured daily cap, and total issued rewards must respect the user's remaining eligible reward budget.
4. Daily counters should reset at the intended platform-local midnight. Verify timezone and reset implementation in the database/API, not the browser clock.
5. A completed ad must not be claimable more than once. Duplicate requests, retries, concurrent claims, cancelled sessions, or manipulated payloads must not create duplicate credits.
6. Ad display integrations, including temporary third-party banners, must remain separate from reward timers, task completion, claim eligibility, wallet balance, and allocation calculations unless an explicitly approved rule says otherwise.
7. Allocated capacity, reward issued, reward remaining/reserved, and wallet balance are different values and must be labelled clearly.
8. Failed financial reads must surface an error, not a fabricated zero. Do not blindly retry non-idempotent reward claims.
9. Visible transaction history is not the authoritative source for computing wallet balance. Use the guarded wallet/database logic.

## 5. Referral eligibility and network scenarios

### A. Signup only, no plan
- Referral code may attribute signup to an inviter.
- Signup alone must not create a paid-plan commission.
- New user remains without an active plan until activation completes.
- Verify referred-by attribution cannot later be changed by an untrusted client.

### B. Direct referral with an eligible active referrer
- Resolve referrer from trusted referral attribution.
- Check active plan and eligibility at the time the referred plan is activated.
- Calculate commission once using the approved rate rule.
- Write traceable ledger/audit records and update summaries from the same authoritative event.
- Repeated approval/activation must not pay the same commission twice.

### C. Direct referral with no eligible active plan
- Do not grant active-plan commission merely because an account signed up or has a referral code.
- Use the approved unassigned/ineligible accounting path and show the reason in admin reporting.
- Do not release the amount later without a defined eligibility and approval rule.

### D. Indirect referral
- Baseline intent: indirect/multi-level rewards are available only to eligible Pro/PKR 900 plan holders and only through Levels 1–6.
- Lower plans must not receive indirect commissions under this baseline.
- Verify each level's rate, percentage base, locked/unlocked status, event-time eligibility, and total payout ceiling in the active database/RPC. Level-specific percentages are not specified here and must not be invented.
- Locked commission is not spendable wallet balance until the approved unlock condition is met.

### E. Duplicate, reversed, or rejected activation
- Deposit/plan activation must be idempotent.
- Rejected deposits must not activate a plan or create purchase commission/reward allocation.
- Reversals/corrections must use auditable compensating entries, not delete or rewrite financial history.
- If a plan was activated or commission paid, investigate the full ledger chain before correction.

## 6. Roles and authorization boundaries

The app's user model includes role names user, admin, super_admin, and moderator. Current source also recognizes admin, super_admin, and moderator as staff in the wallet-history service. This classification is not a complete permission matrix.

| Role | Intended responsibility | Must be verified |
|---|---|---|
| user | Own profile, plan, tasks, wallet/history, deposits, withdrawals, referral network, notifications, support | Ownership checks; cannot choose another user's ID or self-approve financial actions |
| moderator | Limited operational/support review as explicitly granted | Exact permitted modules/actions; no implied payout, role, or wallet authority |
| admin | Routine platform operations and explicitly granted user, plan, deposit, withdrawal, support, and report actions | Server-side authorization for every RPC/endpoint; audit trail |
| super_admin | Highest explicitly authorized administrative actions | Separate server/database enforcement and protected role assignment |

Rules for all roles:

- Trusted server/database role is authoritative; never trust a role string supplied by the browser.
- Hiding an admin button or route does not secure its underlying RPC.
- Review database grants, RLS policies, function ownership/security mode, and caller identity together.
- Impersonation must be explicit and auditable and must not silently leak an admin session into another account.
- Public UID is a display/reference identifier, not a replacement for authenticated identity or authorization.

## 7. Admin workflows and expected accounting outcomes

| Admin action | Expected safe outcome | Required audit/reconciliation |
|---|---|---|
| Approve deposit | Exactly one approved deposit/plan activation after authorized review | Deposit status, plan assignment/activation time, ledger entries, commission and allocation side effects |
| Reject deposit | No active plan and no purchase commission/reward allocation from rejected payment | Rejection reason, proof/reference, no duplicate credit |
| Review withdrawal | State transition through guarded review function | Amount, fee, final paid amount, reviewer, status history, wallet debit/refund handling |
| Reject withdrawal | Previously reserved/deducted amount returned exactly once if current workflow requires it | Original withdrawal reference and one compensating refund; no double refund |
| Manual balance adjustment | Guarded admin RPC, reason required, ledger/audit record | Before/after balance, signed amount, actor, reason, duplicate check |
| Change plan configuration | Approved future configuration and explicit rule for existing users/transactions | Before/after config, effective time, affected users, no silent historical recalculation |
| Assign private offer | Eligible UID only; expiry and one-time redemption enforced | Assignment, expiry, redemption, discount funding, no public leakage |
| Release locked commission | Only after defined unlock condition | Original commission reference, unlock reason, exactly one release |
| Correct accounting discrepancy | Prefer documented compensating entry over rewriting history | Source event, duplicate-count check, ledger/report reconciliation |
| View reports | Totals reconcile to ledger/allocation records and explain exclusions | Time range, status filters, source tables/RPCs, locked/unassigned/reserved treatment |

Current client source routes deposit approval, withdrawal review, and ledger adjustment through named RPCs including admin_approve_deposit, review_withdrawal, and admin_adjust_ledger. This is a code-visible routing fact, not proof that live RPC definitions and permissions are correct. Inspect active database definitions and grants for every sensitive action.

## 8. Wallet, ledger, deposits, and withdrawals

- Wallet balance must follow authoritative database wallet/ledger rules, not a partial UI history sum.
- Each financial entry should have a traceable type, source/reference, timestamp, status, and actor/reason where relevant.
- Plan payment, ad reward, referral commission, reserve movement, platform profit, recovery, withdrawal, refund, and manual adjustment are distinct event types.
- A withdrawal status label alone does not prove money was paid.
- If a withdrawal flow holds/debits funds before payment, rejection must release/refund the exact amount once. If funds are debited only on final payment, do not add a second refund.
- A pending deposit/withdrawal row does not prove success.
- Do not delete financial history to make reports look balanced; use approved correction entries.

## 9. Accounting invariants and reconciliation checklist

Before merging any money-affecting change, verify:

- [ ] The source event is unique and idempotent.
- [ ] Buyer, referrer, active plan, and eligibility come from trusted database state.
- [ ] Allocation percentages use a documented base and sum to the intended total without double allocation.
- [ ] Rounding is deterministic and the remainder has a documented destination.
- [ ] Direct and indirect commission cannot pay the same level/event twice.
- [ ] Reward issued and reward remaining/reserved reconcile to the correct budget definition.
- [ ] Locked commission is excluded from spendable balance until released.
- [ ] Unassigned/ineligible commission is visible and not silently credited to a user.
- [ ] Wallet, ledger, reserve, recovery, admin profit, and reporting summaries reconcile.
- [ ] Rejected, retried, concurrent, or reversed events do not create duplicate money movement.
- [ ] Actor, reason, source reference, and status transitions remain auditable.
- [ ] RLS, grants, server authorization, and RPC definitions were checked.
- [ ] Tests cover normal, unauthorized, duplicate/retry, ineligible-referrer, rejected-payment, and reversal cases.
- [ ] The exact tested commit is the commit proposed for deployment.

Apply these reconciliation identities only after confirming the accounting base:
- Sale allocation total equals the eligible amount allocated for that sale, subject to documented rounding/remainder rules.
- Wallet balance follows authoritative ledger/wallet-state rules; reserve capacity is not automatically a wallet credit.
- Admin reports explain locked commissions, unassigned commissions, pending/rejected transactions, and reserve capacity.
- Recovery collected and recovery remaining do not count the same recovery event twice.

## 10. Current code references

These are review entry points; reopen the current branch before relying on them.

- Plan mapping: [src/lib/deposit-service.ts](../src/lib/deposit-service.ts)
- Plan/user/ledger types and platform state: [src/lib/platform-store.tsx](../src/lib/platform-store.tsx)
- Plan selection UI: [src/routes/_authenticated.plans.tsx](../src/routes/_authenticated.plans.tsx)
- Referral-code capture/validation: [src/lib/referrals.ts](../src/lib/referrals.ts)
- Wallet history and staff classification: [src/lib/transaction-service.ts](../src/lib/transaction-service.ts)
- Admin action orchestration: [src/lib/admin-service.ts](../src/lib/admin-service.ts)
- Architecture/security overview: [CODEBASE_GUIDE.md](./CODEBASE_GUIDE.md)
- API request/security patterns: [API_ARCHITECTURE.md](./API_ARCHITECTURE.md)

The exact source of truth for each money movement is the relevant active Supabase RPC/database function and its permissions, not just the client modules.

## 11. Open verification items — do not mark complete without evidence

1. Compare live plan rows against all target prices, reward limits, task counts, and percentages in Section 2.
2. Resolve the possible 5 / 8 / 30 versus 5 / 7 / 9 task-count mismatch.
3. Trace one purchase of each plan end-to-end through approved deposit, plan activation, allocation buckets, direct commission, recovery, and reports.
4. Confirm whether actual commission uses the referrer's active plan, the purchased plan, or another configured field. Keep one approved interpretation.
5. Verify the direct commission matrix can coexist with the sale-level percentage split without exceeding funds.
6. Inspect indirect Levels 1–6 rates, lock/unlock rules, and total payout ceiling.
7. Inspect active definitions, grants, and RLS for deposit approval, plan activation, reward claim, commission allocation, withdrawal review, wallet adjustment, and admin-profit summary.
8. Reconcile historical ledger rows and admin reports before modifying any report exclusion/formula.
9. Verify timezone and implementation of daily reward reset.
10. Run targeted end-to-end tests against non-production/test data; a successful build is insufficient.

## 12. Required update rule for future changes

Whenever a code, migration, RPC, plan configuration, role permission, or admin workflow change affects financial behavior:

1. Update this file in the same PR as the code change.
2. Add a change-log entry with date, PR/commit, rule affected, source files/RPCs/migration touched, test evidence, and remaining uncertainty.
3. Update tables/examples if any price, rate, cap, eligibility, or allocation changes.
4. Reconcile effects on wallet, ledger, reward reserve, referral commissions, recovery fund, admin profit, deposits/withdrawals, and reports.
5. Mark the change as **implemented and verified**, **implemented but not fully verified**, or **proposed only**. A successful build or UI-only test is not full verification.
6. If implementation and baseline disagree, document the discrepancy and pause money-affecting corrections until the approved rule and historical accounting impact are clear.

### Change log

| Date | PR / commit | Change | Verification status |
|---|---|---|---|
| 2026-10-11 | Documentation baseline | Added initial plan/allocation/referral/admin/fairness reference, including known values and verification gaps. No app or database logic changed. | **Documentation added; live database values and financial implementation not fully reconciled.** |

---

**Safety note:** This document is an operating baseline and review checklist, not an earnings guarantee or proof that the live system is financially correct. Never change live balances or payout logic solely to make figures match this document; first verify the approved rule, live RPC implementation, and historical ledger trail.
