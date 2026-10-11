import { supabase } from "@/integrations/supabase/client";

export type TransactionRowData = {
  id: string;
  transaction_no?: string | null;
  user_id: string | null;
  parent_transaction_id?: string | null;
  kind: string;
  amount: number | null;
  currency?: string | null;
  status: string | null;
  source_type: string | null;
  source_id: string | null;
  description: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  processed_at?: string | null;
};

export async function loadWalletTransactions(): Promise<{ rows: TransactionRowData[]; accountUid: string | null; isStaff: boolean }> {
  const db = supabase as any;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Please sign in again.");
  const uid = authData.user.id;
  const { data: profile, error: profileError } = await db.from("profiles").select("role, public_uid").eq("id", uid).maybeSingle();
  if (profileError) {
    console.error("[AdverX] wallet profile query failed", { code: profileError.code, message: profileError.message });
    throw new Error("Unable to load your account details. Please try again.");
  }
  if (!profile) throw new Error("Your account profile could not be found. Please contact support.");

  const isStaff = ["admin", "super_admin", "moderator"].includes(String(profile.role ?? ""));
  // Personal wallet activity only, including for staff accounts.
  const { data, error } = await db.from("transactions").select("*").eq("user_id", uid)
    .order("created_at", { ascending: false }).order("transaction_no", { ascending: false }).limit(500);
  if (error) {
    console.error("[AdverX] wallet transactions query failed", { code: error.code, message: error.message });
    throw new Error("Unable to load your wallet activity. Please try again.");
  }

  const rows = ((data ?? []) as TransactionRowData[]).map((row) => ({
    ...row,
    amount: row.amount == null ? null : Number(row.amount),
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
  }));

  // Do not silently ignore wallet-state failures: it is the authoritative balance read.
  if (!isStaff) {
    const { error: walletStateError } = await db.rpc("wallet_state", { _user_id: uid });
    if (walletStateError) {
      console.error("[AdverX] wallet state query failed", { code: walletStateError.code, message: walletStateError.message });
      throw new Error("Unable to verify your wallet balance. Please refresh and try again.");
    }
  }

  return { rows, accountUid: String(profile.public_uid ?? "").trim() || null, isStaff };
}
