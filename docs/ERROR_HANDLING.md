# AdverX Error Handling

## Runtime behavior

- The root route boundary renders a safe recovery screen for route/render errors and reports the diagnostic.
- Uncaught browser errors and unhandled promise rejections are captured centrally and forwarded to the existing Lovable reporting hook when available.
- TanStack Query failures are logged centrally with a consistent `[AdverX]` prefix.
- Queries retry at most once to recover from transient network failures. Mutations do not retry automatically because a retry can duplicate a deposit, withdrawal, wallet adjustment, or other financial side effect.
- The root error screen keeps technical details out of the user-facing UI.

## Service-level rules

1. Check every Supabase `error` result; do not silently convert a failed financial/account query into an empty list or zero balance.
2. Log diagnostic details for developers, but show users a concise actionable message. Never include access tokens, passwords, payment credentials, or full private records in logs.
3. Treat balance, ledger, withdrawal, deposit, and reward state as authoritative server/database state. Do not infer financial balances from displayed transaction rows.
4. If a database mutation succeeds but follow-up audit logging fails, report that the mutation may already have completed. Do not tell the user the original mutation failed or retry it blindly.
5. For uploads followed by a database mutation, avoid deleting uploaded evidence on an ambiguous network failure: the database may have committed even if the client did not receive its response.
6. Use `try/catch` when an exception can be translated into a useful message, when cleanup is required, or when a secondary operation (such as notification email) must not undo a successful primary financial operation. Do not add empty catch blocks.

## Scope note

This is a shared runtime foundation and targeted fixes, not a claim that every individual Supabase call in the repository has been manually reviewed. Continue auditing each service and route for unchecked result errors, ignored promise rejections, and misleading success/failure UI. CI success validates the configured lint/build checks, not the correctness of every financial workflow.
