# API Architecture and Scaling Guide

## Goal

AdverX currently uses TanStack Start file-based server routes for HTTP endpoints, with Supabase as the data/auth platform. This guide establishes a repeatable structure for adding endpoints without requiring a risky rewrite of existing routes.

## Current architecture

- **Transport / route layer:** `src/routes/api.*.ts` defines the URL, HTTP methods, request parsing, and response status.
- **Authentication and authorization:** use the existing server-side guards in `src/lib/auth.server.ts` or the domain-specific guard (for example, `src/lib/ad-api.server.ts`). A hidden button or client-side role check is not authorization.
- **Shared HTTP helpers:** `src/lib/api/http.server.ts` contains transport-only JSON parsing and error response helpers.
- **Domain/service layer:** keep reusable business operations in focused modules under `src/lib/*-service.ts` or a domain folder under `src/lib/`.
- **Database enforcement:** Supabase RLS, grants, and guarded RPC/database functions remain the security and consistency boundary for protected or financial operations.

## Recommended request flow

1. Match the file-based route and HTTP method.
2. Reject unsupported methods through the framework's route handler configuration.
3. Authenticate the caller and authorize the specific action on the server.
4. Parse a bounded request body and validate it with Zod or an equivalent explicit schema.
5. Call a domain service or guarded database function; keep complex business logic out of route files.
6. Return a stable JSON response and appropriate HTTP status.
7. Log internal details server-side with a request/correlation identifier where practical; never expose secrets, tokens, SQL details, or raw internal errors to clients.

## Where code belongs

| Concern | Location |
| --- | --- |
| URL, HTTP method, request/response mapping | `src/routes/api.*.ts` |
| Shared HTTP parsing/response primitives | `src/lib/api/http.server.ts` |
| Domain operations reusable across routes | `src/lib/*-service.ts` or `src/lib/<domain>/` |
| Request schemas | `src/lib/input-validation.ts` or a domain-specific schema module |
| Auth guards and role checks | `src/lib/auth.server.ts` and domain-specific server guards |
| Financial invariants, locking, idempotency | Guarded Supabase RPC/database functions and their migrations |
| Supabase clients and generated types | `src/integrations/supabase/` |

## Response and error contract

The shared `jsonError(message, status)` helper returns `{ "error": "..." }` with the specified HTTP status. `readJsonObject(request, maxBytes)` parses only JSON objects and rejects invalid JSON, arrays/primitives, and oversized payloads.

These helpers are intentionally small: they do not authenticate users, validate business fields, decide status codes, or hide a route's authorization requirements. Endpoint-specific response shapes should not be changed casually because existing clients may depend on them. When introducing a new public API family, document its success/error schema and keep it consistent within that family.

## API versioning

Existing URLs are not automatically moved. For new externally consumed APIs, introduce a versioned route family such as `/api/v1/<resource>` only when a stable contract is needed. Keep internal app endpoints compatible until their callers have been migrated and tested. Avoid a single giant route that dispatches many unrelated domains by string action.

## Security checklist

- Authenticate every protected request on the server.
- Authorize the specific resource/action; do not trust user IDs or role flags supplied by the browser.
- Validate body shape, fields, content type, and payload size.
- Use parameterized Supabase queries and guarded RPCs; never build SQL from user strings.
- Use idempotency keys for retryable financial mutations and enforce uniqueness in the database.
- Do not blindly retry deposits, withdrawals, reward claims, commissions, or other side effects.
- Apply rate limits to public/auth-sensitive and expensive endpoints; choose limits based on the route's abuse profile and enforce them at a trusted server/platform boundary.
- Keep service-role keys server-only. Never expose them through `VITE_*` variables or responses.
- Log useful context while redacting credentials, session cookies, bearer tokens, and sensitive personal/financial data.
- Return generic client errors for unexpected failures; preserve detailed causes in protected server logs.
- Test unauthorized, malformed, oversized, duplicate/retried, and normal requests.

## Scaling plan

1. Adopt the shared helpers for new or low-risk endpoint edits.
2. Extract repeated domain logic from route files into service modules.
3. Add schemas per endpoint and typed response contracts as endpoints evolve.
4. Add focused integration tests for auth, validation, idempotency, and status codes.
5. Add request IDs, structured logging, metrics, and rate limiting based on actual operational needs.
6. Introduce API versioning only where a client contract requires it.

Do not batch-refactor all routes just to make them look uniform. Migrate one endpoint at a time with contract tests and explicit review, especially for admin and financial operations.

## Validation

For changes to this structure, run `npm run lint` and `npm run build`. A green build does not by itself validate authorization, production Supabase policy state, or accounting correctness.
