import { createFileRoute } from "@tanstack/react-router";
import { createCsrfMiddleware } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enforceIpRateLimit } from "@/lib/api/rate-limit.server";

function headerValue(request: Request, name: string) {
  const value = request.headers.get(name)?.trim();
  if (!value) return null;
  try {
    return decodeURIComponent(value).slice(0, 120);
  } catch {
    return value.slice(0, 120);
  }
}

function getClientIp(request: Request): string | null {
  // Use the single-IP proxy header supplied by the hosting platform; do not
  // trust a browser-provided query/body value for the client's IP.
  const candidate = request.headers.get("x-real-ip")?.trim();
  if (!candidate || candidate.length > 64) return null;
  // PostgreSQL inet accepts IPv4/IPv6. Reject commas, whitespace and hostnames.
  if (candidate.includes(",") || /\s/.test(candidate) || !/^[0-9a-fA-F:.]+$/.test(candidate)) {
    return null;
  }
  return candidate;
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
          const { error: insertError } = await (supabaseAdmin as any)
            .from("user_access_signals")
            .upsert({
              user_id: data.user.id,
              ip_address: ipAddress,
              country: headerValue(request, "x-vercel-ip-country"),
              region: headerValue(request, "x-vercel-ip-country-region"),
              city: headerValue(request, "x-vercel-ip-city"),
              user_agent: userAgent,
              source: "auth",
            }, { onConflict: "user_id" });

          if (insertError) {
            console.error("[AdverX] access signal insert failed", insertError.message);
            return Response.json({ ok: false }, { status: 500 });
          }
          return Response.json({ ok: true }, { status: 201 });
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("[AdverX] access signal endpoint failed", error);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
