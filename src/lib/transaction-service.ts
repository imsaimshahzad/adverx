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

export async function loadWalletTransactions(): Promise<{
  rows: TransactionRowData[];
  accountUid: string | null;
  isStaff: boolean;
}> {
  const db = supabase as unknown;
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("Please sign in again.");
  const uid = authData.user.id;
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role, public_uid")
    .eq("id", uid)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);

  const isStaff = ["admin", "super_admin", "moderator"].includes(
    String(profile?.role ?? ""),
  );
  // Personal wallet activity only, including for staff accounts.
  const { data, error } = await db
    .from("transactions")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .order("transaction_no", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);

  con¶»§q«^