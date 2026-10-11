# Reusable component and module boundaries

## Admin display helpers

`src/lib/admin-display-utils.ts` owns pure display transformations used by the Admin route:

- `friendlyAdminLabel`: database-field name to human-readable label
- `classifyUser` and `mapUserForDisplay`: normalize user plan/system labels for display
- `userSearchText`: build searchable text from a user row
- `getWithdrawalAccountDetails`: safely normalize legacy/plain-text or object-shaped payout details

These helpers are kept separate from `src/routes/admin.tsx` so they can be unit-tested and reused without importing the large route module. They do not perform database writes or change authorization/accounting rules.

## Existing reusable UI components

Continue to use shared components under `src/components/` for cross-route UI (for example `LoadingIndicator`, `BrandLogo`, `ThemeToggle`, `TransactionRow`, and support/admin panels). Primitive controls belong under `src/components/ui/`.

## Refactoring rules

1. Extract pure formatting/mapping functions before moving stateful route logic.
2. Keep database mutations and financial state transitions in their existing services/RPCs; UI extraction must not change the source of truth.
3. Extract a stateful component only when its inputs and outputs can be explicit props and its state can remain local without changing navigation or permissions.
4. Avoid giant barrel exports; import reusable modules directly.
5. Do not hand-edit generated route files or change route filenames while extracting components.

## Scope

This change extracts pure helpers from the large Admin route as a low-risk first step. It is not a claim that every route has been modularized; larger modules should be split incrementally with tests and visual/financial regression checks.
