/**
 * Legacy fallback for screens that have not yet loaded the canonical
 * public.transactions row. New transaction-center/admin screens should use
 * the database-generated transaction_no (TXN-XXXXXXXX).
 */
export function transactionDisplayId(sourceId: string | null | undefined): string {
  const input = String(sourceId ?? "").trim();
  if (!input) return "TXN-00000000";

  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const number = (hash >>> 0) % 90000000 + 10000000;
  return `TXN-${number}`;
}

export function transactionSourceId(row: Record<string, unknown>): string {
  return String(
    row.transaction_no ??
      row.reference_id ??
      row.transaction_id ??
      row.reference ??
      row.id ??
      "",
  );
}
