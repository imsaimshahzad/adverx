export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export function sessionActivityStorageKey(userId: string, impersonating = false): string {
  return `adverx-last-activity:${userId}${impersonating ? ":impersonation" : ""}`;
}

export function isSessionIdleExpired(lastActivityAt: number, now = Date.now()): boolean {
  return (
    !Number.isFinite(lastActivityAt) ||
    lastActivityAt <= 0 ||
    now - lastActivityAt >= SESSION_IDLE_TIMEOUT_MS
  );
}

export function getSessionIdleRemainingMs(lastActivityAt: number, now = Date.now()): number {
  if (!Number.isFinite(lastActivityAt) || lastActivityAt <= 0) return 0;
  return Math.max(0, SESSION_IDLE_TIMEOUT_MS - (now - lastActivityAt));
}
