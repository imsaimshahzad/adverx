import { supabase } from "@/integrations/supabase/client";
import type { Plan } from "@/lib/platform-store";

type RawPlan = Record<string, unknown>;
const numeric = (value: unknown, fallback = 0) => {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function loadDepositPlan(planId: string): Promise<Plan> {
  const { data, error } = await (supabase as unknown)
    .from("plans")
    .select("*")
    .eq("id", planId)
    .maybeSingle();
  if (error) throw new Error(`Unable to load this plan: ${error.message}`);
  if (!data)
    throw new Error(
      "Unable to load this plan. Please return to Plans and select a plan again.",
    );

  const row = data as RawPlan;
  if (!row.active || row.status !== "active")
    throw new Error("This plan is no longer active.");
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
    dailyRewardLimit: numeric(
      row.daily_reward_limit ?? row.daily_reward_limit_pkr,
    ),
    remainingRewardBudget: 0,
    ¶»§q«^