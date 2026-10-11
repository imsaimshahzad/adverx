import assert from "node:assert/strict";
import test from "node:test";
import { jsonError, readJsonObject } from "./http.server.ts";

test("readJsonObject accepts JSON objects", async () => {
  const request = new Request("https://example.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "start", count: 2 }),
  });

  assert.deepEqual(await readJsonObject(request), { action: "start", count: 2 });
});

test("readJsonObject rejects invalid JSON, arrays, and primitives", async () => {
  for (const body of ["{", "[]", "null", "42", '"text"']) {
    const request = new Request("https://example.test/api", { method: "POST", body });
    assert.equal(await readJsonObject(request), null, `expected rejection for ${body}`);
  }
});

test("readJsonObject rejects oversized bodies even without content-length", async () => {
  const request = new Request("https://example.test/api", {
    method: "POST",
    body: JSON.stringify({ value: "x".repeat(100) }),
  });

  assert.equal(await readJsonObject(request, 32), null);
});

test("readJsonObject rejects oversized content-length before reading", async () => {
  const request = new Request("https://example.test/api", {
    method: "POST",
    headers: { "content-length": "1000" },
    body: "{}",
  });

  assert.equal(await readJsonObject(request, 32), null);
});

test("jsonError preserves the JSON error contract and status", async () => {
  const response = jsonError("Invalid request.", 422);

  assert.equal(response.status, 422);
  assert.deepEqual(await response.json(), { error: "Invalid request." });
});
