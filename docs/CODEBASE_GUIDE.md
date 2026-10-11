# AdverX Codebase Guide

This guide describes the current repository layout and the intended responsibilities of its main modules. It is an orientation document, not a guarantee that every feature has been audited or that production configuration exactly matches Git.

## 1. What the application is

AdverX is a TanStack Start + React + TypeScript web application using Supabase for authentication and application data. The repository also contains Supabase SQL migrations, Supabase Edge Functions, and a separate Drizzle migration history.

The app includes public pages, authenticated member pages, administrative pages, and server/API functionality. The file-based routes are registered through TanStack Router.

## 2. Start here

- `README.md`: setup and key repository rules.
- `docs/PROJECT_STRUCTURE.md`: folder map and generated/database-file cautions.
- `docs/NAMING_CONVENTIONS.md`: naming rules.
- `docs/NAMING_AUDIT_REPORT.md`: scope and findings of the naming audit.
- `docs/ENVIRONMENT_CONFIG.md`: local and deployment environment configuration, if present on the current branch.
- `docs/ERROR_HANDLING.md`: error-handling conventions, if present on the current branch.
- `docs/REUSABLE_COMPONENTS.md`: component/module boundaries, if present on the current branch.
- `docs/STATE_MANAGEMENT.md`: account state boundaries, if present on the current branch.

Some docs above may exist on open feature branches before they are merged to `main`. Confirm the target branch before relying on them.

## 3. Main directories

| Path | Responsibility |
| --- | --- |
| `src/routes/` | File-based pages, layouts, and route handlers. Keep route naming compatible with TanStack Router. |
| `src/components/` | Shared application components. |
| `src/components/ui/` | Reusable UI primitives. |
| `src/lib/` | Domain services, data mapping, validation, formatting, and application helpers. |
| `src/integrations/supabase/` | Supabase clients, authentication integration, and database types. |
| `src/hooks/` | Shared React hooks. |
| `src/router.tsx` | Router and query-client configuration. |
| `src/routes/__root.tsx` | Root route/layout and top-level error handling. |
| `src/routeTree.gen.ts` | Generated route tree; do not edit manually. |
| `supabase/migrations/` | Timestamped Supabase SQL schema/policy/function changes. |
| `supabase/functions/` | Supabase Edge Functions. |
| `drizzle/schema.ts`, `drizzle/migrations/` | Separate Drizzle schema and migration history. |
| `public/` | Static assets. |
| `docs/` | Engineering documentation and audit reports. |

## 4. Route map

These paths reflect route filenames in the repository; route guards and data access must still be checked in the route implementation.

### Public and authentication
- `src/routes/index.tsx`: home/landing route.
- `src/routes/login.tsx`, `signup.tsx`, `auth.tsx`: authentication-related pages/flows.
- `src/routes/reset-password.tsx`: password reset.
- `src/routes/join.$referralCode.tsx`: referral-link entry.

### Member area
- `src/routes/_authenticated.tsx`: authenticated route layout/boundary.
- `src/routes/_authenticated.ads.tsx`: ads/tasks.
- `src/routes/_authenticated.plans.tsx`: plan listing.
- `src/routes/_authenticated.deposit.$planId.tsx`: plan deposit flow.
- `src/routes/_authenticated.withdraw.tsx`: withdrawal flow.
- `src/routes/_authenticated.history.tsx` and `src/routes/transactions.tsx`: transaction/history views.
- `src/routes/_authenticated.network.tsx`: referral network.
- `src/routes/_authenticated.notifications.tsx`: notifications.
- `src/routes/_authenticated.profile.tsx`: profile.
- `src/routes/_authenticated.support.tsx`: support.
- `src/routes/_authenticated.users.detail.$publicUid.tsx`: public-UID member detail.

### Admin
- `src/routes/admin.login.tsx`: admin login.
- `src/routes/admin.tsx`: admin console.
- `src/routes/admin.$.tsx`: admin catch-all route.

A filename is not a security control by itself. Verify authorization in the server/database layer for every protected operation.

## 5. Data and service boundaries

The frontend uses Supabase clients and domain modules. Relevant modules include:

- `src/lib/platform-store.tsx`: account/application snapshot and catalog loading used by the UI.
- `src/lib/transaction-service.ts`: wallet/transaction-related data and operations.
- `src/lib/admin-service.ts`: administrative data and actions.
- `src/lib/deposit-service.ts`: deposit-related operations.
- `src/lib/referrals.ts`: referral-related helpers.
- `src/lib/input-validation.ts`: request/form input schemas.
- `src/lib/display.ts`: display formatting helpers.
- `src/lib/auth.server.ts`, `src/lib/auth-guard.functions.ts`: server-side auth and authorization helpers.
- `src/lib/ad-api.server.ts`: server-side ad API logic.
- `src/integrations/supabase/client.ts` and `client.server.ts`: browser/server Supabase client setup.

Use the module that owns a domain rather than duplicating its rules inside a route. A client service is not a security boundary: the browser can be modified by a user.

## 6. Financial and security invariants

Treat these as mandatory review rules when changing deposits, plans, rewards, commissions, balances, ledger entries, or withdrawals:

1. **Server/database is authoritative.** Do not compute a final wallet balance in a React component or treat a browser snapshot as authoritative.
2. **Authorization must be enforced server-side.** UI visibility and route filenames do not replace server checks, database grants, or Row Level Security (RLS).
3. **Use guarded database functions/RPCs for sensitive transitions** where the existing flow requires them. Review function privileges, caller identity, and RLS together.
4. **Avoid automatic retries for financial mutations.** A retry can duplicate a side effect unless the operation is explicitly idempotent.
5. **Do not silently convert failed financial reads into zero/empty values.** Surface an error and investigate the underlying query or policy.
6. **Do not edit applied migration files.** Add a new timestamped migration that is narrowly scoped and reversible where possible.
7. **Never put service-role credentials in browser-exposed variables** such as `VITE_*` or `NEXT_PUBLIC_*`.
8. **Preserve auditability.** Prefer corrective entries and explicit audit metadata over deleting or rewriting financial history.
9. **Validate accounting impact before merging.** Check affected users, ledger entries, reserves, allocations, admin reports, and idempotency—not only whether the UI looks correct.

## 7. Database migrations

There are two migration histories in the repository:

- `supabase/migrations/` is the Supabase SQL migration history.
- `drizzle/migrations/` is a separate Drizzle migration history.

Do not assume they are interchangeable or replay both against the same database. Before applying any migration, compare the target database's actual schema and migration history with the intended change. Use a new timestamped Supabase migration for Supabase changes; do not rewrite a migration that may already have run in production.

After a schema change, review generated/hand-maintained database types and any affected queries, policies, RPC grants, and Edge Functions.

## 8. Local development and checks

Typical workflow:

1. Install a Node.js version compatible with the current Vite/TanStack toolchain.
2. Install dependencies with `npm install`.
3. Create a local environment file from `.env.example` if that file exists on the checked-out branch. Keep real values out of Git.
4. Start the dev server: `npm run dev`.
5. Run static checks: `npm run lint`.
6. Run a production build: `npm run build`.

The scripts currently defined in `package.json` include `dev`, `build`, `build:dev`, `preview`, `lint`, and `format`. A passing lint/build verifies only the checks that actually ran; it does not prove accounting correctness, authorization safety, or production environment parity.

## 9. Environment and deployment

- Review `vite.config.ts` and the checked-out branch's environment guide for the supported variable names.
- Keep local secrets in ignored local environment files.
- Configure Vercel variables separately for Development, Preview, and Production when those environments are used.
- Any environment-variable change generally requires a new deployment to take effect.
- Do not paste secrets into issues, logs, PR descriptions, or browser-visible configuration.
- Review the Vercel deployment result and runtime logs separately from GitHub Actions; a green CI run is not proof that production has deployed the same commit.

## 10. Error handling and debugging

When a page fails:

1. Capture the exact visible message and the browser console/network error.
2. Determine whether the failure is a UI/rendering problem, a rejected request, an authorization/RLS error, or a missing environment variable.
3. Inspect the responsible route and service module before changing code.
4. For Supabase errors, check the query, current authenticated user, RLS policies, grants, and relevant migration state.
5. For financial actions, check the database function/RPC result and ledger/audit trail before retrying.
6. Add an error message that is useful to the user without exposing secrets, raw tokens, or sensitive internal details.

Do not fix a failed query by masking its error with a fabricated zero balance or empty history.

## 11. Safe contribution checklist

Before opening a PR:

- [ ] Confirm the branch and base commit.
- [ ] Keep the change scoped; avoid unrelated formatting churn.
- [ ] Keep route files and generated files in framework-compatible locations.
- [ ] Add a new migration rather than editing applied migration history.
- [ ] Review authorization, RLS, grants, and server-side validation for protected actions.
- [ ] Review retries/idempotency for mutations.
- [ ] Run `npm run lint` and `npm run build`, and inspect failures.
- [ ] Test the affected flow with appropriate non-production accounts/data.
- [ ] For financial changes, reconcile balances, ledgers, reserves, commissions, and admin reporting before and after.
- [ ] Record what was tested and what remains unverified in the PR.

## 12. Scope and limitations

This guide is based on repository structure and named modules. It is not a complete line-by-line audit, security certification, accounting reconciliation, or confirmation of the live production schema. Always inspect the actual code, current migrations, database policies/functions, and deployment configuration before making a sensitive change.
