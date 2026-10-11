import { supabaseAdmin } from "@/integrations/supabase/client.server";

type RateLimitResult = {
  allowed?: boolean;
  retry_after?: number;
  attempts?: number;
};

export type RateLimitOptions = {
  identifier: string;
  routeKey: string;
  limit: number;
  windowSeconds: number;
};

/** Uses AdverX's existing atomic PostgreSQL limiter shared across serverless instances. */
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
  const key = `api:${routeKey}:${bucketKey}`;

  try {
    const { data, error } = await (supabaseAdmin as any).rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
      p_backoff_base_seconds: 0,
      p_backoff_max_seconds: windowSeconds,
    });

    if (error) {
      console.error("[AdVerX] API rate-limit check failed", {
        routeKey,
        code: error.code,
      });
      return rateLimitUnavailable();
    }

    const result = data as RateLimitResult | null;
    if (!result || typeof result.allowed !== "boolean") {
      console.error("[AdVerX] API rate-limit RPC returned an invalid response", { routeKey });
      return rateLimitUnavailable();
    }

    if (result.allowed) return null;

    const retryAfter = Math.max(1, Math.ceil(Number(result.retry_after) || windowSeconds));
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
  } catch (error) {
    console.error("[AdVerX] API rate-limit check threw an exception", {
      routeKey,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return rateLimitUnavailable();
  }
}

function rateLimitUnavailable(): Response {
  // Fail closed: database errors must not silently disable request protection.
  return Response.json(
    { error: "Request protection is temporarily unavailable. Please retry shortly." },
    { status: 503, headers: { "Retry-After": "5", "Cache-Control": "no-store" } },
  );
}

/** Use only for routes without an authenticated identity; raw IPs are never persisted. */
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
