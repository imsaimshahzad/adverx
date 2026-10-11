# Application state management

## Account state

The authenticated account snapshot in `src/lib/platform-store.tsx` uses a typed reducer with three explicit transitions:

- `hydrate`: replace the snapshot with the server-loaded account state
- `set-user`: initialize a minimal snapshot after authentication
- `clear`: reset account data on sign-out

The reducer does not calculate wallet balances, reward eligibility, referral commissions, or withdrawal outcomes. Those remain server/database-backed and refresh from Supabase, avoiding a competing optimistic financial source of truth.

## State boundaries

- Account/server snapshot: PlatformProvider and Supabase.
- URL/navigation state: TanStack Router.
- Server-query cache: TanStack Query where route-level caching/invalidation is appropriate.
- Short-lived form/dialog state: local component state.
- Persistent preferences: explicit local-storage-backed preference handling only.

Existing request-version guards remain in place to ignore stale refresh results. New async work should preserve these guards, expose errors explicitly, and never silently turn failed financial queries into empty balances.

Catalog arrays and large context slices should be migrated incrementally with build, lint, and wallet/reward regression checks. Do not duplicate server-owned financial data in browser storage or introduce a second global store.
