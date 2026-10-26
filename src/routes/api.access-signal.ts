import { createFileRoute } from "@tanstack/react-router";
import { createCsrfMiddleware } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enforceIpRateLimit } from "@/lib/api/rate-limit.server";

function headerValue(request: Request, ...names: string[]) {
  for (const name of names) {
    const value = request.headers.get(name)?.trim();
    if (!value) continue;
    try {
      return decodeURIComponent(value).slice(0, 120);
    } catch {
      return value.slice(0, 120);
    }
  }
  return null;
}

function getClientIp(request: Request): string | null {
  // Cloudflare's CF-Connecting-IP identifies the visitor, unlike x-real-ip
  // which may identify the Cloudflare edge. Only accept a single IP literal.
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-real-ip"),
    request.headers.get("x-forwarded-for")?.split(",")[0],
  ];
  for (const raw of candidates) {
    const candidate = raw?.trim();
    if (!candidate || candidate.length > 64 || candidate.includes(",") || /\s/.test(candidate)) continue;
    if (!/^[0-9a-fA-F:.]+$/.test(candidate)) continue;
    // Reject malformed colon/dot-only values; PostgreSQL validates inet too.
    if (!/[0-9a-fA-F]/.test(candidate)) continue;
    return candidate;
  }
  return null;
}

export const Route = createFileRoute("/api/access-signal")({
  server: {
    middleware: [createCsrfMiddleware()],
    handlers: {
      POST: async ({ request }) => {
        try {
          const limited = await enforceIpRateLimit(request, "access-signal", 12, 60);
          if (limited) return limited;

          const authorization = request.headers.get("authorization");
          if (!authorization?.startsWith("Bearer ")) {
            return Response.json({ ok: false }, { status: 401 });
          }
          const token = authorization.slice(7).trim();
          if (!token || token.length > 4096) {
            return Response.json({ ok: false }, { status: 401 });
          }

          const { data, error } = await supabaseAdmin.auth.getUser(token);
          if (error || !data.user) return Response.json({ ok: false }, { status: 401 });

          const ipAddress = getClientIp(request);
          const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;
          const { error: upsertError } = await (supabaseAdmin as any)
            .from("user_access_signals")
            .upsert({
              user_id: data.user.id,
              ip_address: ipAddress,
              country: headerValue(request, "x-vercel-ip-country", "cf-ipcountry"),
              region: headerValue(request, "x-vercel-ip-country-region"),
              city: headerValue(request, "x-vercel-ip-city"),
              user_agent: userAgent,
              source: "dashboard",
              created_at: new Date().toISOString(),
            }, { onConflict: "user_id" });

          if (upsertError) {
            console.error("[AdverX] access signal upsert failed", upsertError.message);
            return Response.json({ ok: false }, { status: 500 });
          }
          return Response.json({ ok: true }, { status: 200 });
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("[AdverX] access signal endpoint failed", error);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
