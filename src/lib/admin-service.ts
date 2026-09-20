import { supabase } from "@/integrations/supabase/client";

export type AdminRow = Record<string, unknown>;
export type AdminModule =
  | "overview"
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
  | "ledger"
  | "fraud"
  | "reports"
  | "settings"
  | "notifications"
  | "support"
  | "audit-logs";

const db = supabase as any;

export async function queryRows(table: string, columns = "*") {
  const result = await db.from(table).select(columns).limit(100);
  if (result.error) throw result.error;
  return (result.data ?? []) as AdminRow[];
}

export async function queryCount(
  table: string,
  filters: Record<string, unknown> = {},
) {
  let query = db.from(table).select("id", { count: "exact", head: true });
  for (const [key, value] of Object.entries(filters))
    query = query.eq(key, value);
  const result = await query;
  if (result.error) throw result.error;
  return result.count ?? 0;
}

export async function adjustLedger(
  userId: string,
  value: number,
  note: string,
) {
  const { data, error } = await db.rpc("admin_adjust_ledger", {
    p_user_id: userId,
    p_amount: value,
    p_reason: note,
  });
  if (error) throw error;
  return data as AdminRow;
}

export async function dispatchNotification(
  userId: string,
  title: string,
  body: string,
) {
  const { data, error } = await db.rpc("admin_dispatch_notification", {
    p_user_id: userId,
    p_title: title,
    p_body: body,
  });
  if (error) throw error;
  return data as AdminRow;
}

export async function reviewWithdrawal(
  id: string,
  nextStatus: "approved" | "processing" | "paid" | "rejected",
  note?: string,
) {
  const { data, error } = await db.rpc("review_withdrawal", {
    p_id: id,
    p_status: nextStatus,
    p_note: note ?? null,
  });
  if (error) {
    if (error.code === "42501") throw new Error("You do not have permission to review withdrawals.");
    throw new Error(error.message ?? "Unable to update withdrawal.");
  }
  return data as AdminRow;
}

export async function approveDeposit(
  id: string,
  nextStatus: "approved" | "rejected",
  rejectionReason?: string,
) {
  const { data, error } = await db.rpc("admin_approve_deposit", {
    p_deposit_id: id,
    p_next_status: nextStatus,
    p_rejection_reason: rejectionReason ?? null,
  });
  if (error) {
    console.error("[v0] admin_approve_deposit failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      depositId: id,
      nextStatus,
    });
    const detail = [error.message, error.code ? `code ${error.code}` : "", error.details, error.hint].filter(Boolean).join(" — ");
    throw new Error(detail || "Deposit approval failed.");
  }
  return data as AdminRow;
}

export async function transitionRow(
  table: string,
  id: string,
  expectedStatus: string,
  nextStatus: string,
  action: string,
) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Your session has expired.");
  const result = await db
    .from(table)
    .update({ status: nextStatus })
    .eq("id", id)
    .eq("status", expectedStatus)
    .select()
    .maybeSingle();
  if (result.error)
    throw new Error(`Unable to update ${table}: ${result.error.message}`);
  if (!result.data) {
    const current = await db.from(table).select("status").eq("id", id).maybeSingle();
    if (current.data?.status && current.data.status !== expectedStatus) {
      throw new Error("This request has already been processed.");
    }
    if (!current.data) throw new Error("This record no longer exists.");
    throw new Error("This action is not valid for the record's current status.");
  }
  const audit = await db.from("audit_logs").insert({
    actor_id: auth.user.id,
    action,
    entity_type: table,
    entity_id: id,
    metadata: { from: expectedStatus, to: nextStatus },
  });
  if (audit.error) throw audit.error;
  return result.data as AdminRow;
}

export async function updateRow(
  table: string,
  id: string,
  changes: AdminRow,
  action: string,
) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Your session has expired.");
  const result = await db
    .from(table)
    .update(changes)
    .eq("id", id)
    .select()
    .single();
  if (result.error)
    throw new Error(`Unable to update ${table}: ${result.error.message}`);
  const audit = await db.from("audit_logs").insert({
    actor_id: auth.user.id,
    action,
    entity_type: table,
    entity_id: id,
    metadata: changes,
  });
  if (audit.error)
    throw new Error(
      `Updated ${table}, but audit logging failed: ${audit.error.message}`,
    );
  return result.data as AdminRow;
}

export async function insertRow(
  table: string,
  values: AdminRow,
  action: string,
) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Your session has expired.");
  const result = await db.from(table).insert(values).select().single();
  if (result.error)
    throw new Error(`${table} insert failed: ${result.error.message}`);
  const audit = await db.from("audit_logs").insert({
    actor_id: auth.user.id,
    action,
    entity_type: table,
    entity_id: result.data?.id,
    metadata: values,
  });
  if (audit.error)
    throw new Error(
      `Record created, but audit logging failed: ${audit.error.message}`,
    );
  return result.data as AdminRow;
}

export async function deleteOrArchive(table: string, id: string) {
  const archiveField = table === "plans" ? { active: false, status: "archived" } : table === "ads" ? { status: "archived" } : table === "deposit_methods" || table === "withdrawal_methods" ? { is_active: false } : { active: false };
  const dependencyTable = table === "plans" ? "user_plans" : table === "ads" ? "reward_transactions" : table === "deposit_methods" ? "deposits" : table === "withdrawal_methods" ? "withdrawals" : null;
  if (dependencyTable) {
    let dependency;
    if (table === "withdrawal_methods") {
      const method = await db.from(table).select("name").eq("id", id).maybeSingle();
      dependency = method.data ? await db.from("withdrawals").select("id", { count: "exact", head: true }).eq("method", method.data.name) : { count: 0, error: null };
    } else {
      const dependencyColumn = table === "plans" ? "plan_id" : table === "ads" ? "ad_id" : "method_id";
      dependency = await db.from(dependencyTable).select("id", { count: "exact", head: true }).eq(dependencyColumn, id);
    }
    if (dependency.error && dependency.error.code !== "42703") throw new Error("Unable to verify whether this item can be deleted.");
    if ((dependency.count ?? 0) > 0) {
      const archived = await db.from(table).update(archiveField).eq("id", id).select().maybeSingle();
      if (archived.error) throw new Error("This item is being used by existing records. Deactivate it instead.");
      return { mode: "archived" as const, id };
    }
  }
  const deleted = await db.from(table).delete().eq("id", id).select("id").maybeSingle();
  if (deleted.error) {
    if (["plans", "ads", "deposit_methods"].includes(table)) {
      const archived = await db.from(table).update(archiveField).eq("id", id).select().maybeSingle();
      if (!archived.error && archived.data) return { mode: "archived" as const, id };
    }
    throw new Error("This item cannot be permanently deleted because it has existing records. Deactivate/archive it instead.");
  }
  if (!deleted.data) throw new Error("This item was not found or has already been removed.");
  return { mode: "deleted" as const, id };
}

export async function saveManagementRow(
  table: string,
  id: string,
  changes: AdminRow,
) {
  const allowed = new Set([
    "plans",
    "ads",
    "deposit_methods",
    "withdrawal_methods",
  ]);
  if (!allowed.has(table)) throw new Error("This record is not editable here.");
  return updateRow(table, id, changes, `admin_update_${table}`);
}

export type OperationsOverview = {
  total_users: number;
  active_users: number;
  gross_plan_sales: number;
  today_plan_sales: number;
  approved_plan_sales: number;
  pending_deposits: number;
  pending_withdrawals: number;
  completed_withdrawals: number;
  total_rewards_issued: number;
  total_remaining_user_reward_reserves: number;
  total_referral_commissions: number;
  today_ad_completions: number;
  pending_support_tickets: number;
  risk_alerts: number;
  advertiser_revenue: number;
  total_recovery_fund_collected: number;
  total_recovery_fund_used: number;
  remaining_recovery_fund: number;
  total_ad_budget_recovered: number;
  platform_profit_total?: number;
  unassigned_referral_total?: number;
  retained_reward_budget_total?: number;
};

export type AdminProfitSummary = AdminRow & {
  total_admin_profit?: number;
  total_profit?: number;
  platform_profit?: number;
  today_profit?: number;
  month_profit?: number;
  unassigned_referral?: number;
  total_unassigned_referral?: number;
  admin_platform_total?: number;
  retained_reward_budget?: number;
  available_balance?: number;
  total_withdrawn?: number;
  withdrawn_balance?: number;
  pending_withdrawals?: number;
  pending_balance?: number;
  total_owed_to_users?: number;
  users_with_balance?: number;
  users_in_debt?: number;
  admin_own_balance?: number;
  unallocated_recovery?: number;
  unallocated_recovery_withdrawable?: boolean;
  platform_withdrawn_paid?: number;
  platform_withdrawals_pending?: number;
};

export async function getOperationsOverview() {
  const { data, error } = await db.rpc("admin_operations_overview");
  if (error) throw new Error("Unable to load operations metrics.");
  return (data ?? {}) as OperationsOverview;
}

export async function getAdminProfitSummary() {
  const { data, error } = await db.rpc("admin_profit_summary");
  if (error) throw new Error("Unable to load admin profit summary.");
  return (data ?? {}) as AdminProfitSummary;
}

export async function getAdminProfitLedger() {
  const { data, error } = await db.rpc("admin_profit_ledger_page");
  if (error) throw new Error("Unable to load admin profit ledger.");
  return (data ?? []) as AdminRow[];
}

export async function getRecoveryFundActivity() {
  const { data, error } = await db
    .from("recovery_fund_ledger")
    .select("id, entry_type, amount_pkr, reference_id, user_id, plan_id, note, created_at")
    .is("user_id", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Unable to load Unallocated Recovery activity: ${error.message}`);

  let balance = 0;
  const chronological = (data ?? []).map((row: AdminRow) => {
    const entryType = String(row.entry_type ?? "").toLowerCase();
    const amount = Math.abs(Number(row.amount_pkr ?? 0));
    balance += entryType === "debit" ? -amount : entryType === "reversal" ? amount : amount;

    return {
      ...row,
      amount: row.amount_pkr,
      usage_type: row.entry_type,
      target_user_id: row.user_id,
      reason: row.note,
      reference: row.reference_id,
      balance_after: balance,
    };
  });

  return chronological.reverse() as AdminRow[];
}

export async function getRevenuePlans() {
  const { data, error } = await db
    .from("plans")
    .select("id, name, title, price_pkr, admin_profit_pct, direct_referral_pct, recovery_fund_pct, ad_budget_pct")
    .order("price_pkr", { ascending: true });
  if (error) throw new Error(`Unable to load plan allocation details: ${error.message}`);
  return (data ?? []) as AdminRow[];
}

export async function useRecoveryFund(values: {
  amount: number;
  usageType: "User Recovery" | "Platform Recovery" | "Other";
  targetUserId?: string | null;
  reason: string;
  reference?: string;
}) {
  const { data, error } = await db.rpc("admin_use_recovery_fund", {
    p_amount: values.amount,
    p_usage_type: values.usageType,
    p_target_user_id: values.targetUserId ?? null,
    p_reason: values.reason,
    p_reference: values.reference?.trim() || null,
  });
  if (error) throw new Error(error.message || "Unable to use Recovery Fund.");
  return data as AdminRow;
}

export async function replySupportTicket(ticketId: string, status: "open" | "in_progress" | "resolved" | "closed", reply: string) {
  const { data, error } = await db.rpc("admin_reply_support_ticket", {
    p_ticket_id: ticketId,
    p_status: status,
    p_reply: reply.trim() || null,
  });
  if (error) throw new Error(error.message || "Unable to update complaint.");
  return data as AdminRow;
}

export async function setUserStatus(userId: string, status: "active" | "suspended" | "restricted") {
  const { data, error } = await db.rpc("admin_set_user_status", {
    p_user_id: userId,
    p_status: status,
  });
  if (error) throw new Error(error.message || "Unable to update user status.");
  return data as AdminRow;
}

export async function getUsersPage(search = "", status = "", page = 1, pageSize = 25) {
  const [{ data: profiles, error: profilesError }, { data: activePlans, error: plansError }, { data: plans, error: planNamesError }] = await Promise.all([
    db.from("profiles").select("*").order("created_at", { ascending: false }),
    db.from("user_plans").select("user_id, plan_id, status").eq("status", "active"),
    db.from("plans").select("id, name"),
  ]);

  if (profilesError || plansError || planNamesError) {
    throw new Error("Unable to load users.");
  }

  const planById = new Map(
    (plans ?? []).map((plan: AdminRow) => [String(plan.id), String(plan.name ?? "")]),
  );
  const activePlanByUser = new Map<string, AdminRow>();
  for (const activePlan of activePlans ?? []) {
    const userId = String(activePlan.user_id ?? "");
    if (userId && !activePlanByUser.has(userId)) {
      activePlanByUser.set(userId, activePlan);
    }
  }

  const normalizedSearch = search.trim().toLowerCase();
  const matchingRows = (profiles ?? [])
    .map((profile: AdminRow) => {
      const activePlan = activePlanByUser.get(String(profile.id));
      const planName = activePlan ? planById.get(String(activePlan.plan_id)) ?? "" : "";
      return {
        ...profile,
        active_plan_name: planName,
        user_plan_status: activePlan?.status ?? null,
        has_active_plan: Boolean(activePlan && planName),
      };
    })
    .filter((row: AdminRow) => {
      const matchesSearch = !normalizedSearch || JSON.stringify(row).toLowerCase().includes(normalizedSearch);
      const matchesStatus = !status || String(row.status ?? "").toLowerCase() === status.toLowerCase();
      return matchesSearch && matchesStatus;
    });

  const offset = Math.max(0, page - 1) * pageSize;
  return matchingRows.slice(offset, offset + pageSize).map((row: AdminRow) => ({
    ...row,
    total_count: matchingRows.length,
  })) as AdminRow[];
}

export async function getReserveSummary() {
  const { data, error } = await db.rpc("admin_reserve_summary");
  if (error) throw new Error("Unable to load reserve summary.");
  return (data ?? []) as AdminRow[];
}

export async function adjustUserReserve(userPlanId: string, amount: number, reason: string) {
  const { data, error } = await db.rpc("admin_adjust_user_reserve", {
    p_user_plan_id: userPlanId,
    p_amount: amount,
    p_reason: reason,
  });
  if (error) throw new Error(error.message.includes("not authorized") ? "You do not have permission to adjust reserves." : error.message);
  return data as AdminRow;
}

export function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value.includes("T"))
    return new Date(value).toLocaleString();
  return String(value);
}

export function amount(
  rows: AdminRow[],
  keys = ["amount", "value", "platform_revenue"],
) {
  return rows.reduce(
    (total, row) =>
      total +
      Number(
        keys
          .map((key) => row[key])
          .find((value) => value !== null && value !== undefined) ?? 0,
      ),
    0,
  );
}
