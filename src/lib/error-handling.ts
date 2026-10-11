/**
 * Shared error helpers for client-side services and global error boundaries.
 * Keep detailed diagnostics in logs; show concise, actionable messages to users.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name || "Unknown error";
  if (error instanceof Response) return `Request failed with status ${error.status}`;
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return "An unexpected error occurred.";
}

export function reportError(scope: string, error: unknown): void {
  const detail = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { message: describeError(error) };
  console.error(`[AdverX] ${scope}`, detail);
}

export function userFacingError(error: unknown, fallback: string): string {
  const message = describeError(error);
  // Do not expose transport/framework internals or opaque object stringification.
  if (!message || message === "An unexpected error occurred." || message === "[object Object]") {
    return fallback;
  }
  return message;
}
