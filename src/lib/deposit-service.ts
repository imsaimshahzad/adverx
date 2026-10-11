import { supabase } from "@/integrations/supabase/client";
import type { Plan } from "@/lib/platform-store";

type RawPlan = Record<string, unknown>;
const numeric = (value: unknown, fallback = 0) => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function loadDepositPlan(planId: string): Promise<Plan> {
  const { data, error } = await (supabase as any).from("plans").select("*").eq("id", planId).maybeSingle();
  if (error) throw new Error(`Unable to load this plan: ${error.message}`);
  if (!data) throw new Error("Unable to load this plan. Please return to Plans and select a plan again.");

  const row = data as RawPlan;
  if (!row.active || row.status !== "active") throw new Error("This plan is no longer active.");
  return {
    id: String(row.id),
    name: String(row.name ?? "Plan"),
    price: numeric(row.price_pkr ?? row.min_deposit),
    description: String(row.description ?? "Verified rewards plan"),
    durationDays: numeric(row.duration_days, 30),
    dailyAdLimit: numeric(row.daily_task_limit ?? row.ads_per_day),
    rewardBudget: numeric(row.reward_budget ?? row.reward_budget_pkr),
    baseAdReward: numeric(row.base_ad_reward ?? row.base_ad_reward_pkr),
    maxAdReward: numeric(row.max_ad_reward ?? row.max_ad_reward_pkr),
    dailyRewardLimit: numeric(row.daily_reward_limit ?? row.daily_reward_limit_pkr),
    remainingRewardBudget: 0,
    referralRewardAllocated: numeric(row.referral_reward_allocated),
    adminProfitPct: numeric(row.admin_profit_pct),
    referrerCommissionPct: numeric(row.referrer_commission_pct),
    indirectReferralPct: numeric(row.indirect_referral_pct),
    recoveryFundPct: numeric(row.recovery_fund_pct),
    adBudgetPct: numeric(row.ad_budget_pct),
    recoveryPerReferral: numeric(row.recovery_per_referral_pkr),
    minWithdrawal: numeric(row.min_withdrawal ?? row.min_withdrawal_pkr),
    networkEligible: Boolean(row.referral_eligible ?? row.referral_enabled),
    highlight: Boolean(row.highlight),
  };
}

export async function uploadProofAndSubmitDeposit(input: {
  file: File;
  planId: string;
  method: string;
  transactionId: string;
  submitDeposit: (input: { planId: string; method: string; transactionId: string; proofName: string; imageHash: string }) => Promise<unknown> | unknown;
}): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Invalid authenticated user");
  const path = `${auth.user.id}/${crypto.randomUUID()}-${input.file.name}`;
  const { error: uploadError } = await supabase.storage.from("payment-proofs").upload(path, input.file, { contentType: input.file.type, upsert: false });
  if (uploadError) throw new Error(`Receipt upload failed: ${uploadError.message}`);
  const digest = await crypto.subtle.digest("SHA-256", await input.file.arrayBuffer());
  const imageHash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  await input.submitDeposit({ planId: input.planId, method: input.method, transactionId: input.transactionId, proofName: path, imageHash });
}
