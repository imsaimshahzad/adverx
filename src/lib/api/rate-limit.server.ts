import { supabaseAdmin } from "@/integrations/supabase/client.server";

type RateLimitRow = {
  allowed: boolean;
  remaining: number;
  reset_at: string;
};

export type RateLimitOptions = {
  identifier: string;
  routeKey: string;
  limit: number;
  windowSeconds: number;
};

/** Uses an atomic PostgreSQL RPC so limits are shared across serverless instances. */
export async function enforceRateLimit({
  identifier,
  routeKey,
  limit,
  windowSeconds,
}: RateLimitOptions): Promise<Response | null> {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier || !routeKey || limit < 1 || windowSeconds < 1) {
    return Response.json({ error: "Rate limit configuration error." }, { status: 500 });
  }

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalizedIdentifier),
  );
  const bucketKey = Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");

  const { data, error } = await (supabaseAdmin as any).rpc("consume_api_rate_limit", {
    p_bucket_key: bucketKey,
    p_route_key: routeKey,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    // Fail closed: an unavailable limiter must not silently disable protection.
    console.error("[AdverX] API rate-limit check failed", {
      routeKey,
      code: error.code,
    });
    return Response.json(
      { error: "Request protection is temporarily unavailable. Please retry shortly." },
      { status: 503, headers: { "Retry-After": "5", "Cache-Control": "no-store" } },
    );
  }

  const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null;
  if (!row || typeof row.allowed !== "boolean") {
    console.error("[AdverX] API rate-limit RPC returned an invalid response", { routeKey });
    return Response.json(
      { error: "Request protection is temporarily unavailable. Please retry shortly." },
      { status: 503, headers: { "Retry-After": "5", "Cache-Control": "no-store" } },
    );
  }

  if (row.allowed) return null;

  const retryAfter = Math.max(
    1,
    Math.ceil((Date.parse(row.reset_at) - Date.now()) / 1000),
  );
  return Response.json(
    { error: "Too many requests. Please wait before trying again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "Cache-Control": "no-store",
      },
    },
  );
}

/** Use only for routes without an authenticated identity; raw IPs are never stored. */
export function getRequestRateLimitIdentity(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",").at(-1)?.trim();
  return `ip:${realIp || forwardedIp || "unknown"}`;
}

export function enforceIpRateLimit(
  request: Request,
  routeKey: string,
  limit: number,
  windowSeconds: number,
): Promise<Response | null> {
  return enforceRateLimit({
    identifier: getRequestRateLimitIdentity(request),
    routeKey,
    limit,
    windowSeconds,
  });
}
