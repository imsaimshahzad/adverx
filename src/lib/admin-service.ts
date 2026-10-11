import { supabase } from "@/integrations/supabase/client";

export type AdminRow = Record<string, unknown>;
export type AdminModule =
  | "overview"
  | "cash-payments"
  | "funds-reserves"
  | "users"
  | "plans"
  | "tasks"
  | "advertisers"
  | "revenue"
  | "reward-pool"
  | "reserves"
  | "deposits"
  | "deposit-methods"
  | "withdrawals"
  | "withdrawal-methods"
  | "referrals"
  | "referral-commissions"
  | "transactions"
  | "ledger"
  | "fraud"
  | "reports"
  | "settings"
  | "notifications"
  | "email"
  | "support"
  | "audit-logs";

const db = supabase as unknown;

async function invokeAdminEmail(body: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token) {
    console.warn("[AdVerX] admin email skipped: no authenticated session");
    return { data: null, error: new Error("Missing authenticated session.") };
  }

  try {
    const { data, error } = await supabase.functions.invoke(
      "admin-send-email",
      {
        body,
      },
    );

    if (error) {
      console.error("[AdVerX] admin email function failed", error);
      return { data, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("[AdVerX] admin email function failed", error);
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error("Email service request failed."),
    };
  }
}

export async function queryRows(table: st¶»§q«^