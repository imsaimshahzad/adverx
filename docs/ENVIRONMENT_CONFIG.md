# Environment configuration

AdverX reads Supabase connection settings from environment variables rather than embedding project-specific values in application source.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` to the Supabase project URL.
3. Set `VITE_SUPABASE_PUBLISHABLE_KEY` to that project's publishable key (or legacy anon key if the project still uses one).
4. Run `npm install`, then `npm run dev`.

The repository ignores `.env`, `.env.*`, and local override files, while explicitly allowing `.env.example` to be committed. Do not commit `.env.local` or real environment values.

## Vercel setup

Set the same public browser variables in the Vercel project settings, scoped separately to **Development**, **Preview**, and **Production** as appropriate. Preview should normally use a non-production Supabase project when one is available.

The Vite configuration loads environment files for the active mode and supports these aliases for existing deployment setups:

- URL: `VITE_SUPABASE_URL`, `SUPABASE_URL`, or `NEXT_PUBLIC_SUPABASE_URL`
- Publishable key: `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, or legacy `SUPABASE_ANON_KEY`

Prefer the `VITE_*` names for local browser configuration. Aliases are kept for compatibility with existing hosting environments.

## Security rules

- `VITE_*` and `NEXT_PUBLIC_*` values are bundled into client-side code. Only the Supabase URL and publishable/anon key belong there; these are public identifiers/keys protected by Supabase Row Level Security, not privileged secrets.
- Never expose a Supabase service-role/secret key, database password, SMTP password, private API token, or signing secret through a client-prefixed variable.
- Server-only credentials should be configured in the hosting platform's server/Edge Function secrets, not this example file and not browser code.
- Do not add real credentials to `.env.example`. Use placeholder values only.
- Keep production, preview, and local values separately scoped. Avoid pointing Preview at production unless explicitly intended.

## Validation

The browser client fails fast with a configuration error when its required Supabase URL or publishable key is missing. Confirm that the variables exist in the selected Vercel environment after changing settings; existing deployments do not retroactively pick up changed environment values and need a new deployment.
