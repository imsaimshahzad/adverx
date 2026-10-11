# AdverX Naming Audit Report

**Audit scope:** GitHub `main` branch at audit time. Repository tree exposed 330 tracked files. This is a repository naming/layout audit, not a full semantic review of every symbol or a financial/security certification.

## Result summary

- **No broad source/database rename is justified** from the file-level patterns inspected.
- **One concrete naming inconsistency corrected:** `package.json` used the template name `tanstack_start_ts`; it is now `adverx`.
- **One documentation accuracy issue corrected:** the hook naming example now matches the actual `src/hooks/use-mobile.tsx` file and its exported `useIsMobile()` hook.
- Existing generated and compatibility-sensitive names were intentionally preserved.

## Findings and disposition

| Area | Observed pattern | Result / action |
|---|---|---|
| App-owned React components | PascalCase filenames, e.g. `AdminEmailComposer.tsx`, `SupportTicketPanel.tsx`, `TransactionRow.tsx` | Consistent; no rename needed |
| Generated UI components | lowercase kebab-case in `src/components/ui/` | Intentional shadcn/ui convention; preserve |
| Service and helper modules | kebab-case, e.g. `admin-service.ts`, `deposit-service.ts`, `transaction-service.ts`, `input-validation.ts` | Consistent within this layer |
| React hook | `src/hooks/use-mobile.tsx` exports `useIsMobile()` | Valid hook name; documented accurately |
| TanStack routes | route filenames encode nested paths/parameters, e.g. `_authenticated.deposit.$planId.tsx`, `join.$referralCode.tsx`, `api.ads.$action.ts` | Framework convention; do not normalize by hand |
| Generated route tree | `src/routeTree.gen.ts` | Generated artifact; do not hand-rename |
| Supabase migrations | timestamp prefix plus snake_case action/subject, e.g. `20261011104727_secure_exact_referral_code_validation.sql` | Consistent |
| SQL-facing identifiers | snake_case examples include `created_at` and `admin_profit_summary()` | Appropriate database convention; preserve deployed contracts |
| Package metadata | Previously `tanstack_start_ts` | Corrected to `adverx` |
| Environment/configuration names | `SUPABASE_URL`-style uppercase names | Appropriate convention; preserve integration contracts |

## Risk controls

No Supabase table/column/RPC, financial function, route URL, environment variable, generated file, or wallet/reward/deposit/withdrawal ledger identifier was renamed. Such renames can break deployed dependencies or external callers and require a dedicated dependency audit plus a compatibility migration.

## Validation status

- GitHub Actions ran successfully for the conventions-document commit `aa475bf72dd36609b8d90fc1feb3fdd6a66664d8`.
- The package metadata and documentation corrections in this report are new commits; their own CI run must finish successfully before claiming those latest changes passed lint/build.
- This report is **not** a 100% guarantee that every variable/type/function in all source files follows every style rule. A file-tree audit can reliably assess naming/layout patterns, but exhaustive symbol-level linting and application/financial behavior tests are separate validations.

## Recommended ongoing rule

Use the convention for each layer/directory rather than forcing one casing style across the entire repository. Only rename a symbol when all references can be updated together; database/API contract changes require explicit compatibility planning.
