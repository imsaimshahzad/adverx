import assert from "node:assert/strict";
import test from "node:test";
import { requestCoalescedRun } from "./refresh-coordinator.ts";

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

test("coalesces force requests during an active refresh into one follow-up", async () => {
  const pending = { current: false };
  const running = { current: null as Promise<void> | null };
  const firstRun = deferred();
  const secondRun = deferred();
  let runs = 0;

  const run = async () => {
    runs += 1;
    if (runs === 1) await firstRun.promise;
    if (runs === 2) await secondRun.promise;
  };

  const first = requestCoalescedRun(pending, running, run);
  assert.equal(runs, 1);

  // Several forced actions arrive before the first refresh finishes.
  const second = requestCoalescedRun(pending, running, run);
  const third = requestCoalescedRun(pending, running, run);
  assert.equal(first, second);
  assert.equal(second, third);
  assert.equal(runs, 1);

  firstRun.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  assert.equal(runs, 2, "all queued requests produce one follow-up, not one run each");

  secondRun.resolve();
  await first;
  assert.equal(runs, 2);
  assert.equal(running.current, null);
});

test("a request arriving during the queued follow-up schedules exactly one more run", async () => {
  const pending = { current: false };
  const running = { current: null as Promise<void> | null };
  const firstRun = deferred();
  const followUp = deferred();
  let runs = 0;

  const run = async () => {
    runs += 1;
    if (runs === 1) await firstRun.promise;
    if (runs === 2) await followUp.promise;
  };

  const queued = requestCoalescedRun(pending, running, run);
  firstRun.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  assert.equal(runs, 2);

  requestCoalescedRun(pending, running, run);
  followUp.resolve();
  await queued;
  assert.equal(runs, 3);
});
