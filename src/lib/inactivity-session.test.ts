import test from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_IDLE_TIMEOUT_MS,
  getSessionIdleRemainingMs,
  isSessionIdleExpired,
  sessionActivityStorageKey,
} from "./inactivity-session.ts";

test("15 minutes is the exact inactivity expiry boundary", () => {
  const lastActivity = 1_000_000;
  assert.equal(isSessionIdleExpired(lastActivity, lastActivity + SESSION_IDLE_TIMEOUT_MS - 1), false);
  assert.equal(isSessionIdleExpired(lastActivity, lastActivity + SESSION_IDLE_TIMEOUT_MS), true);
});

test("remaining inactivity time is calculated without extending the deadline", () => {
  const lastActivity = 1_000_000;
  assert.equal(getSessionIdleRemainingMs(lastActivity, lastActivity + 60_000), SESSION_IDLE_TIMEOUT_MS - 60_000);
  assert.equal(getSessionIdleRemainingMs(lastActivity, lastActivity + SESSION_IDLE_TIMEOUT_MS), 0);
});

test("invalid or missing activity timestamps expire safely", () => {
  assert.equal(isSessionIdleExpired(0, 1_000_000), true);
  assert.equal(isSessionIdleExpired(Number.NaN, 1_000_000), true);
});

test("impersonation activity is isolated from the real user's session key", () => {
  assert.equal(sessionActivityStorageKey("user-1"), "adverx-last-activity:user-1");
  assert.equal(sessionActivityStorageKey("user-1", true), "adverx-last-activity:user-1:impersonation");
});
