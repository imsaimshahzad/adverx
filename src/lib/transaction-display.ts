/**
 * Human-facing transaction/tracing IDs.
 *
 * These IDs intentionally do not replace database UUIDs or payment-provider
 * transaction IDs. They are deterministic display identifiers so the same
 * record keeps the same tracking number everywhere without changing accounting
 * logic or stored balances.
 */
export function transactionDisplayId(sourceId: string | null | undefined): string {
  const input = String(sourceId ?? "").trim();
  if (!input) return "TXN-000000000";

  // 32-bit FNV-1a style hash. The 9-digit display space keeps the chance of
  // accidental collision low for the current transaction volume while the
  // underlying UUID remains the authoritative machine identifier.
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const number = (hash >>> 0) % 900000000 + 100000000;
  return `TXN-${number}`;
}

export function transactionSourceId(
  row: Record<string, unknown>,
): string {
  return String(
    row.reference_id ??
      row.transaction_id ??
      row.reference ??
      row.id ??
      "",
  );
}
