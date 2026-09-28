import type { ReactNode } from "react";

export type DisplayStatus = {
  label: string;
  className: string;
};

const TYPE_MAP: Record<string, { label: string; icon: string }> = {
  deposit: { label: "Deposit", icon: "💰" },
  withdrawal: { label: "Withdrawal", icon: "💸" },
  plan_purchase: { label: "Plan Purchase", icon: "💳" },
  plan_ad_budget: { label: "Ad Reward Budget", icon: "🎁" },
  ad_reward: { label: "Ad Reward", icon: "🎬" },
  task_reward: { label: "Ad Reward", icon: "🎬" },
  referral_commission: { label: "Referral Reward", icon: "👥" },
  referral_reward: { label: "Referral Reward", icon: "👥" },
  platform_admin_profit: { label: "Platform Fee", icon: "🏦" },
  platform_profit: { label: "Platform Fee", icon: "🏦" },
  admin_adjustment: { label: "Balance Adjustment", icon: "🛠️" },
  refund: { label: "Refund", icon: "↩️" },
  withdrawal_refund: { label: "Withdrawal Refund", icon: "↩️" },
  unassigned_referral: { label: "Referral Allocation", icon: "👥" },
};

const PLAIN_DESCRIPTION: Record<string, string> = {
  deposit: "Deposit submitted",
  withdrawal: "Withdrawal request",
  plan_purchase: "Plan purchase",
  plan_ad_budget: "Ad reward budget",
  ad_reward: "Advertisement completed",
  task_reward: "Advertisement completed",
  referral_commission: "Direct referral reward",
  referral_reward: "Referral reward",
  platform_admin_profit: "Platform fee",
  platform_profit: "Platform fee",
  admin_adjustment: "Balance adjustment",
  refund: "Refund issued",
  withdrawal_refund: "Withdrawal returned",
  unassigned_referral: "Referral allocation",
};

export function formatMoney(amount: unknown, currency = "PKR"): string {
  if (amount === null || amount === undefined || amount === "" || !Number.isFinite(Number(amount))) return "—";
  const value = Number(amount);
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const number = Math.abs(value).toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${sign}${number} ${currency}`;
}

export function formatDate(date: unknown): string {
  if (date === null || date === undefined || date === "") return "—";
  const parsed = new Date(String(date));
  if (Number.isNaN(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed).replace(", ", " · ");
}

export function shortId(uuid: unknown): string {
  const value = String(uuid ?? "").trim();
  if (!value) return "—";
  return `TXN-${value.slice(0, 8).toUpperCase()}`;
}

export function shortUserId(publicUid: unknown): string {
  const value = String(publicUid ?? "").trim();
  return value ? `UID ${value}` : "—";
}

export function typeLabel(value: unknown): { label: string; icon: string } {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return { label: "Other", icon: "•" };
  if (raw.endsWith("_correction")) return { label: "Balance Correction", icon: "🛠️" };
  return TYPE_MAP[raw] ?? { label: "Other", icon: "•" };
}

export function plainDescription(value: unknown): string {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "—";
  if (raw.endsWith("_correction")) return "Balance correction";
  return PLAIN_DESCRIPTION[raw] ?? "—";
}

export function statusBadge(status: unknown): DisplayStatus {
  const raw = String(status ?? "").trim().toLowerCase();
  if (["approved", "credited", "completed", "paid"].includes(raw)) {
    return { label: "Approved", className: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  }
  if (["pending", "under_review", "processing"].includes(raw)) {
    return { label: "Pending", className: "border-amber-200 bg-amber-50 text-amber-700" };
  }
  if (["rejected", "failed"].includes(raw)) {
    return { label: raw === "failed" ? "Failed" : "Rejected", className: "border-rose-200 bg-rose-50 text-rose-700" };
  }
  if (raw) return { label: raw === "open" ? "Open" : raw.replaceAll("_", " "), className: "border-slate-200 bg-slate-50 text-slate-700" };
  return { label: "—", className: "border-slate-200 bg-slate-50 text-slate-500" };
}

export function safeDisplayText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

export function displayIcon(value: unknown): ReactNode {
  return typeLabel(value).icon;
}
