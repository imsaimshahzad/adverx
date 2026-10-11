import type { AdminRow } from "@/lib/admin-service";
import { shortId } from "@/lib/display";

type UserClassification = {
  paid: boolean;
  plan: "starter" | "growth" | "pro" | "elite" | null;
  system: boolean;
};

export function friendlyAdminLabel(field: string) {
  const labels: Record<string, string> = {
    id: "Record ID", user_id: "User", referrer_id: "Referrer", referred_id: "Referred User",
    sponsor_id: "Sponsor", recipient_id: "Recipient", owner_id: "Owner", created_by: "Created By",
    approved_by: "Approved By", reviewed_by: "Reviewed By", moderator_id: "Moderator",
    public_uid: "Public UID", referral_code: "Referral Code", price_pkr: "Price (PKR)",
    reward_budget_pkr: "Reward Budget (PKR)", base_ad_reward_pkr: "Base Ad Reward (PKR)",
    max_ad_reward_pkr: "Max Ad Reward (PKR)", daily_reward_limit_pkr: "Daily Reward Limit (PKR)",
    max_lifetime_reward_pkr: "Max Lifetime Reward (PKR)", ads_per_day: "Daily Ads Limit",
    direct_referral_pct: "Direct Referral (%)", referrer_commission_pct: "Referral Commission (%)",
    indirect_referral_pct: "Indirect Referral (%)", admin_profit_pct: "Admin Profit (%)",
    recovery_fund_pct: "Recovery Fund (%)", ad_budget_pct: "Ad Budget (%)",
    recovery_per_referral_pkr: "Recovery Per Referral (PKR)", max_recovery_pkr: "Max Recovery (PKR)",
    duration_seconds: "Duration (Seconds)", created_at: "Date & Time", updated_at: "Updated At",
    status: "Status", role: "Role", entry_type: "Transaction Type", reference_id: "Reference",
    transaction_id: "Transaction", transaction_no: "Transaction No.", task_type: "Task Type",
  };
  return labels[field] ?? field.replaceAll("_", " ").replace(/\\b\\w/g, (char) => char.toUpperCase());
}

export function classifyUser(row: AdminRow): UserClassification {
  const role = String(row.role ?? row.account_role ?? "").toLowerCase();
  const accountType = String(row.account_type ?? row.user_type ?? "").toLowerCase();
  const system = row.is_admin === true || row.is_system === true || ["admin", "super_admin", "moderator", "system"].includes(role) || ["admin", "system"].includes(accountType);
  const nestedPlan = row.plan && typeof row.plan === "object" ? row.plan as Record<string, unknown> : null;
  const planName = String(row.active_plan_name ?? row.plan_name ?? row.plan_title ?? row.plan_name_snapshot ?? nestedPlan?.name ?? "").toLowerCase();
  const plan = planName.includes("starter") ? "starter" : planName.includes("growth") ? "growth" : planName.includes("pro") ? "pro" : planName.includes("elite") ? "elite" : null;
  const planStatus = String(row.user_plan_status ?? row.plan_status ?? row.subscription_status ?? "").toLowerCase();
  const hasActivePlan = row.has_active_plan === true || row.active_plan === true || row.plan_active === true || planStatus === "active" || planStatus === "paid";
  return { paid: !system && hasActivePlan && Boolean(plan), plan: hasActivePlan ? plan : null, system };
}

export function mapUserForDisplay(row: AdminRow): AdminRow {
  const classification = classifyUser(row);
  const name = String(row.full_name ?? row.username ?? row.email ?? "Unknown user").trim() || "Unknown user";
  const safeUid = String(row.public_uid ?? row.username ?? row.email ?? "").trim() || "User";
  const planLabel = classification.system
    ? "Pro / System"
    : classification.plan
      ? `${classification.plan.slice(0, 1).toUpperCase()}${classification.plan.slice(1)}`
      : "No Plan";
  return {
    ...row,
    user: name,
    user_name: name,
    user_uid: safeUid,
    plan: planLabel,
    payment: classification.system ? "System/Admin" : classification.paid ? "Paid" : "Unpaid",
  };
}

export function userSearchText(row: AdminRow) {
  const classification = classifyUser(row);
  return [
    row.full_name,
    row.username,
    row.email,
    row.phone,
    row.public_uid,
    row.referral_code,
    row.referred_by,
    row.role,
    row.account_role,
    row.active_plan_name,
    classification.plan,
    classification.system ? "system admin" : classification.paid ? "paid" : "unpaid",
    row.plan,
    row.payment,
    row._related_search,
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase();
}

export function getWithdrawalAccountDetails(value: unknown): { holder: string; number: string } {
  let details: Record<string, unknown> = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    details = value as Record<string, unknown>;
  } else if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        details = parsed as Record<string, unknown>;
      } else {
        return { holder: "", number: value.trim() };
      }
    } catch {
      // Older records may store the account number as plain text.
      return { holder: "", number: value.trim() };
    }
  }
  const pick = (...keys: string[]) => {
    for (const key of keys) {
      const item = details[key];
      if (typeof item === "string" && item.trim()) return item.trim();
    }
    return "";
  };
  return {
    holder: pick("holder", "account_holder", "accountHolder", "holder_name", "name"),
    number: pick("number", "account_number", "accountNumber", "mobile", "phone", "mobile_number"),
  };
}
