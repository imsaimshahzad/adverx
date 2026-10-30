export type MutableRef<T> = { current: T };

/**
 * Runs one async task at a time and coalesces requests received while it is
 * running into a single follow-up run.
 */
export function requestCoalescedRun(
  pending: MutableRef<boolean>,
  running: MutableRef<Promise<void> | null>,
  run: () => Promise<void>,
): Promise<void> {
  pending.current = true;

  if (!running.current) {
    const current = (async () => {
      while (pending.current) {
        pending.current = false;
        await run();
      }
    })().finally(() => {
      if (running.current === current) running.current = null;
    });
    running.current = current;
  }

  return running.current;
}
