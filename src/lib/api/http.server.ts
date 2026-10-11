/**
 * Shared HTTP helpers for server-side API route handlers.
 *
 * Keep endpoint-specific authorization, validation, and business rules in the
 * route/domain layer. These helpers only standardize transport behavior.
 */

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Parse a JSON object request body. Returns null for invalid JSON, arrays,
 * primitives, or an oversized body. Callers choose the endpoint-specific
 * client error message and status code.
 */
export async function readJsonObject(
  request: Request,
  maxBytes = 64 * 1024,
): Promise<Record<string, unknown> | null> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return null;

  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > maxBytes) return null;

    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}
