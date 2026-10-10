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

const db = supabase as any;

async function invokeAdminEmail(body: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.access_token) {
    console.warn("[AdVerX] admin email skipped: no authenticated session");
    return { data: null, error: new Error("Missing authenticated session.") };
  }

  try {
    const { data, error } = await supabase.functions.invoke("admin-send-email", {
      body,
    });

    if (error) {
      console.error("[AdVerX] admin email function failed", error);
      return { data, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("[AdVerX] admin email function failed", error);
    return { data: null, error: error instanceof Error ? error : new Error("Email service request failed.") };
  }
}

export async function queryRows(table: string, columns = "*") {
  const result = await db.from(table).select(columns).limit(100);
  if (result.error) throw result.error;
  return (result.data ?? []) as AdminRow[];
}

/**
 * Fetch every ledger row in stable newest-first order.
 * The generic admin tables intentionally use a small preview; Wallet Ledger
 * must not silently stop at the first 100 entries.
 */
export async function queryAllRows(table: string, columns = "*") {
  const pageSize = 1000;
  const allRows: AdminRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await db
      .from(table)
      .select(columns)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (result.error) throw result.error;
    const page = (result.data ?? []) as AdminRow[];
    allRows.push(...page);
    if (page.length < pageSize) break;
  }
  return allRows;
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

export { invokeAdminEmail };

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

  try {
    const { data: emailResult, error: emailError } = await invokeAdminEmail({ ledger_adjustment_user_id: userId, amount: value, note });
    if (emailError) console.warn("[AdverX] Ledger adjustment email failed:", emailError);
    else if (emailResult?.success === false) console.warn("[AdverX] Ledger adjustment email rejected:", emailResult.error);
  } catch (emailCause) {
    console.warn("[AdverX] Ledger adjustment email could not be sent:", emailCause);
  }

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

export async function broadcastNotification(title: string, body: string) {
  const { data, error } = await db.rpc("admin_broadcast_notification", {
    p_title: title,
    p_body: body,
  });
  if (error) throw error;
  return Number(data ?? 0);
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
    console.error("[AdVerX] reviewWithdrawal failed", error);
    throw new Error("Unable to update withdrawal.");
  }
  try {
    const { data: emailResult, error: emailError } = await invokeAdminEmail({ withdrawal_id: id, note: note ?? null });
    if (emailError) console.warn("[AdVerX] Withdrawal status email failed:", emailError);
    else if (emailResult?.success === false) console.warn("[AdVerX] Withdrawal status email rejected:", emailResult.error);
  } catch (emailCause) {
    console.warn("[AdVerX] Withdrawal status email could not be sent:", emailCause);
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
    throw new Error("Deposit approval failed.");
  }

  if (nextStatus === "approved" || nextStatus === "rejected") {
    try {
      const { data: emailResult, error: emailError } = await invokeAdminEmail({ deposit_id: id, reason: rejectionReason ?? null });
      if (emailError) {
        console.warn("[AdVerX] Deposit approved email failed:", emailError);
      } else if (emailResult?.success === false) {
        console.warn("[AdVerX] Deposit status email rejected:", emailResult.error);
      }
    } catch (emailCause) {
      console.warn("[AdVerX] Deposit status email could not be sent:", emailCause);
    }

    try {
      const { data: deposit } = await db
        .from("deposits")
        .select("user_id, plan_id")
        .eq("id", id)
        .maybeSingle();
      if (deposit?.user_id && deposit?.plan_id) {
        const { data: userPlan } = await db
          .from("user_plans")
          .select("id")
          .eq("user_id", deposit.user_id)
          .eq("plan_id", deposit.plan_id)
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (userPlan?.id) {
          const { data: planEmail, error: planEmailError } = await invokeAdminEmail({ user_plan_id: userPlan.id })
          if (planEmailError) console.warn("[AdVerX] Plan activation email failed:", planEmailError);
          else if (planEmail?.success === false) console.warn("[AdVerX] Plan activation email rejected:", planEmail.error);
        }
      }
    } catch (planEmailCause) {
      console.warn("[AdVerX] Plan activation email could not be sent:", planEmailCause);
    }
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
  if (result.error) {
    console.error(`[AdVerX] update ${table} failed`, result.error);
    throw new Error("Unable to update this record.");
  }
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
  if (result.error) {
    console.error(`[AdVerX] update ${table} failed`, result.error);
    throw new Error("Unable to update this record.");
  }
  const audit = await db.from("audit_logs").insert({
    actor_id: auth.user.id,
    action,
    entity_type: table,
    entity_id: id,
    metadata: changes,
  });
  if (audit.error) {
    console.error(`[AdVerX] audit logging failed after updating ${table}`, audit.error);
    throw new Error("The record was updated, but the audit log could not be saved.");
  }
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
  if (result.error) {
    console.error(`[AdVerX] insert into ${table} failed`, result.error);
    throw new Error("Unable to create this record.");
  }
  const audit = await db.from("audit_logs").insert({
    actor_id: auth.user.id,
    action,
    entity_type: table,
    entity_id: result.data?.id,
    metadata: values,
  });
  if (audit.error) {
    console.error(`[AdVerX] audit logging failed after inserting into ${table}`, audit.error);
    throw new Error("The record was created, but the audit log could not be saved.");
  }
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
  total_withdrawals_paid: number;
  tracked_cash_retained: number;
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
  user_wallet_payable?: number;
  reward_reserve_payable?: number;
  profile_recovery_reserve_payable?: number;
  admin_payable_balance?: number;
  total_payable_liability?: number;
  actual_cash_available?: number;
  cash_surplus_shortfall?: number;
  cash_coverage_pct?: number;
};

export type AdminProfitSummary = AdminRow & {
  total_admin_profit?: number;
  total_profit?: number;
  platform_profit?: number;
  today_profit?: number;
  today_admin_earnings?: number;
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

export async function setAdminCashBalance(amountPkr: number) {
  if (!Number.isFinite(amountPkr) || amountPkr < 0) {
    throw new Error("Cash balance must be zero or greater.");
  }
  const { data, error } = await db.rpc("admin_set_cash_balance", {
    p_amount: amountPkr,
  });
  if (error) throw new Error(error.message || "Unable to update actual cash balance.");
  return Number(data ?? amountPkr);
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
  if (error) { console.error("[AdVerX] Unallocated Recovery activity query failed", error); throw new Error("Unable to load Unallocated Recovery activity."); }

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

export async function getReferrerRecoveryReserve() {
  const { data, error } = await db
    .from("profiles")
    .select("recovery_reserve_pkr")
    .gt("recovery_reserve_pkr", 0);
  if (error) { console.error("[AdVerX] referrer recovery reserve query failed", error); throw new Error("Unable to load referrer recovery reserve."); }
  return (data ?? []).reduce(
    (total: number, row: AdminRow) => total + Number(row.recovery_reserve_pkr ?? 0),
    0,
  );
}

export async function getRevenuePlans() {
  const { data, error } = await db
    .from("plans")
    .select("id, name, price_pkr, admin_profit_pct, direct_referral_pct, referrer_commission_pct, indirect_referral_pct, recovery_fund_pct, ad_budget_pct, activity_rules")
    .order("price_pkr", { ascending: true });
  if (error) { console.error("[AdVerX] plan allocation query failed", error); throw new Error("Unable to load plan allocation details."); }
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
  if (error) { console.error("[AdVerX] Recovery Fund action failed", error); throw new Error("Unable to use Recovery Fund."); }
  return data as AdminRow;
}

export async function replySupportTicket(ticketId: string, status: "open" | "in_progress" | "resolved" | "closed", reply: string) {
  const { data, error } = await db.rpc("admin_reply_support_ticket", {
    p_ticket_id: ticketId,
    p_status: status,
    p_reply: reply.trim() || null,
  });
  if (error) { console.error("[AdVerX] complaint update failed", error); throw new Error("Unable to update the complaint."); }
  return data as AdminRow;
}

export async function setUserStatus(userId: string, status: "active" | "suspended" | "restricted") {
  const normalizedUserId = String(userId ?? "").trim();
  if (!normalizedUserId) throw new Error("Invalid user ID.");
  if (!["active", "suspended", "restricted"].includes(status)) {
    throw new Error("Invalid user status.");
  }

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Your session has expired.");

  const { data: targetProfile, error: targetProfileError } = await db
    .from("profiles")
    .select("id, full_name, username, public_uid, role, status")
    .eq("id", normalizedUserId)
    .maybeSingle();

  if (targetProfileError) {
    throw new Error(targetProfileError.message || "Unable to load this user.");
  }
  if (!targetProfile) {
    throw new Error("User not found or you do not have permission to update this user.");
  }

  if (["admin", "super_admin", "moderator"].includes(String(targetProfile.role).toLowerCase())) {
    throw new Error("Protected admin account: role and status cannot be changed.");
  }

  const { data, error } = await db
    .from("profiles")
    .update({ status })
    .eq("id", normalizedUserId)
    .select("id, full_name, username, public_uid, role, status")
    .maybeSingle();

  if (error) {
    console.error("[AdVerX] profile status update failed", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      userId: normalizedUserId,
      status,
    });
    throw new Error(error.message || "Unable to update user status.");
  }

  if (!data) {
    throw new Error("User not found or you do not have permission to update this user.");
  }

  void invokeAdminEmail({ user_id: normalizedUserId, user_status: status })
    .then(({ data: emailResult, error: emailError }) => {
      if (emailError) console.warn("[AdVerX] Account status email failed:", emailError);
      else if (emailResult?.success === false) console.warn("[AdVerX] Account status email rejected:", emailResult.error);
    })
    .catch((emailCause) => {
      console.warn("[AdVerX] Account status email could not be sent:", emailCause);
    });

  return data as AdminRow;
}

export async function getUserDetails(identifier: string) {
  let profileResult = await db.from("profiles").select("*").eq("public_uid", identifier).maybeSingle();
  if (!profileResult.data && !profileResult.error) {
    profileResult = await db.from("profiles").select("*").eq("id", identifier).maybeSingle();
  }
  if (profileResult.error || !profileResult.data) throw new Error("User not found.");
  const profile = profileResult.data as AdminRow;
  const userId = String(profile.id);
  const [{ data: userPlans, error: userPlansError }, { data: planRows, error: planRowsError }, { data: deposits, error: depositsError }, { data: withdrawals, error: withdrawalsError }, { data: commissions, error: commissionsError }, { data: ledger, error: ledgerError }] = await Promise.all([
    db.from("user_plans").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("plans").select("id, name"),
    db.from("deposits").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("withdrawals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("referral_commissions").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    db.from("ledger_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
  ]);

  if (userPlansError || planRowsError || depositsError || withdrawalsError || commissionsError || ledgerError) {
    throw new Error("Unable to load user details.");
  }

  const planById = new Map((planRows ?? []).map((row: AdminRow) => [String(row.id), row]));
  const mappedPlans = (userPlans ?? []).map((row: AdminRow) => ({
    ...row,
    plan_display_name: row.plan_name_snapshot ?? planById.get(String(row.plan_id))?.name ?? "—",
  }));

  const approvedDeposits = (deposits ?? []).filter((row: AdminRow) => row.status === "approved");
  const paidWithdrawals = (withdrawals ?? []).filter((row: AdminRow) => row.status === "paid");
  const completedCommissions = (commissions ?? []).filter((row: AdminRow) => row.status === "completed");

  const balanceEntryTypes = new Set([
    "ad_reward",
    "referral_reward",
    "referral_commission",
    "referral_commission_lock",
    "refund",
    "admin_adjustment",
    "withdrawal",
    "withdrawal_refund",
  ]);
  const completedStatuses = new Set(["completed", "credited", "paid", "approved"]);
  const balance = (ledger ?? [])
    .filter((row: AdminRow) => balanceEntryTypes.has(String(row.entry_type ?? "").toLowerCase()))
    .filter((row: AdminRow) => !["cancelled", "reversed", "rejected"].includes(String(row.status ?? "").toLowerCase()))
    .filter((row: AdminRow) => {
      const type = String(row.entry_type ?? "").toLowerCase();
      return type === "withdrawal" || completedStatuses.has(String(row.status ?? "").toLowerCase()) || row.status == null;
    })
    .reduce((sum: number, row: AdminRow) => {
      const amount = Number(row.amount ?? 0);
      return sum + (String(row.entry_type ?? "").toLowerCase() === "withdrawal" ? -Math.abs(amount) : amount);
    }, 0);

  return {
    profile,
    plans: mappedPlans,
    deposits: deposits ?? [],
    withdrawals: withdrawals ?? [],
    commissions: commissions ?? [],
    ledger: ledger ?? [],
    summary: {
      balance,
      deposits: approvedDeposits.reduce((sum: number, row: AdminRow) => sum + Number(row.amount ?? 0), 0),
      withdrawals: paidWithdrawals.reduce((sum: number, row: AdminRow) => sum + Number(row.amount ?? 0), 0),
      transactions: ledger?.length ?? 0,
      total_invest: mappedPlans.reduce((sum: number, row: AdminRow) => sum + Number(row.purchase_price_pkr ?? 0), 0),
      referral_commission: completedCommissions.reduce((sum: number, row: AdminRow) => sum + Number(row.amount ?? 0), 0),
    },
  } as AdminRow;
}

export async function getUsersPage(search = "", status = "", page = 1, pageSize = 25) {
  const [
    { data: profiles, error: profilesError },
    { data: activePlans, error: plansError },
    { data: plans, error: planNamesError },
    { data: transactions, error: transactionsError },
    { data: deposits, error: depositsError },
    { data: withdrawals, error: withdrawalsError },
  ] = await Promise.all([
    db.from("profiles").select("*").order("created_at", { ascending: false }),
    db.from("user_plans").select("user_id, plan_id, status").eq("status", "active"),
    db.from("plans").select("id, name"),
    db.from("transactions").select("*").order("created_at", { ascending: false }),
    db.from("deposits").select("*").order("created_at", { ascending: false }),
    db.from("withdrawals").select("*").order("created_at", { ascending: false }),
  ]);

  if (
    profilesError ||
    plansError ||
    planNamesError ||
    transactionsError ||
    depositsError ||
    withdrawalsError
  ) {
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

  // Build searchable tokens from related financial records as well.
  // This lets Admin → Users find a user by TXID / transaction reference,
  // deposit reference, withdrawal reference, or any related record value.
  const relatedSearchByUser = new Map<string, string[]>();
  const addRelatedRows = (rows: AdminRow[]) => {
    for (const row of rows) {
      const userId = String(row.user_id ?? "").trim();
      if (!userId) continue;
      const tokens = relatedSearchByUser.get(userId) ?? [];
      tokens.push(JSON.stringify(row));
      relatedSearchByUser.set(userId, tokens);
    }
  };
  addRelatedRows((transactions ?? []) as AdminRow[]);
  addRelatedRows((deposits ?? []) as AdminRow[]);
  addRelatedRows((withdrawals ?? []) as AdminRow[]);

  const normalizedSearch = search.trim().toLowerCase();
  const matchingRows = (profiles ?? [])
    .map((profile: AdminRow) => {
      const activePlan = activePlanByUser.get(String(profile.id));
      const planName = activePlan ? planById.get(String(activePlan.plan_id)) ?? "" : "";
      const relatedSearch = relatedSearchByUser.get(String(profile.id))?.join(" ") ?? "";
      return {
        ...profile,
        active_plan_name: planName,
        user_plan_status: activePlan?.status ?? null,
        has_active_plan: Boolean(activePlan && planName),
        _related_search: relatedSearch,
      };
    })
    .filter((row: AdminRow) => {
      const matchesSearch =
        !normalizedSearch ||
        JSON.stringify(row).toLowerCase().includes(normalizedSearch);
      const matchesStatus =
        !status ||
        String(row.status ?? "").toLowerCase() === status.toLowerCase();
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
  if (error) { console.error("[AdVerX] reserve adjustment failed", error); throw new Error(error.message?.includes("not authorized") ? "You do not have permission to adjust reserves." : "Unable to adjust reserves."); }
  return data as AdminRow;
}

export function formatValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && value.includes("T")) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
  }
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
