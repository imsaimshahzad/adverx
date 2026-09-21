import { ensureSupabaseSessionReady, isImpersonating, supabase } from "@/integrations/supabase/client";
import { getAdminProfitSummary, type AdminProfitSummary } from "@/lib/admin-service";
import { toast } from "sonner";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

const db = supabase as any;

export type Plan = {
  id: string;
  name: string;
  price: number;
  description: string;
  durationDays: number | null;
  dailyAdLimit: number;
  rewardBudget: number;
  baseAdReward: number;
  maxAdReward: number;
  dailyRewardLimit: number;
  remainingRewardBudget: number;
  adminProfitPct: number;
  referrerCommissionPct: number;
  recoveryFundPct: number;
  adBudgetPct: number;
  recoveryPerReferral: number;
  minWithdrawal: number;
  networkEligible: boolean;
  highlight?: boolean;
};
export type DepositStatus = "pending" | "approved" | "rejected";
export type Deposit = {
  id: string;
  planId: string;
  amount: number;
  method: string;
  transactionId: string;
  proofName: string;
  status: DepositStatus;
  createdAt: number;
};
export type LedgerType =
  | "deposit"
  | "ad_reward"
  | "referral_reward"
  | "withdrawal"
  | "refund"
  | "adjustment"
  | "platform_admin_profit"
  | "unassigned_referral"
  | "admin_adjustment"
  | "withdrawal_refund";
export type LedgerEntry = {
  id: string;
  type: LedgerType;
  label: string;
  credit: number;
  debit: number;
  status: string;
  createdAt: number;
  reference?: string;
};
export type WithdrawalStatus =
  "pending" | "under_review" | "approved" | "paid" | "rejected";
export type Withdrawal = {
  id: string;
  amount: number;
  fee: number;
  method: string;
  account: string;
  status: WithdrawalStatus;
  createdAt: number;
};
export type Ad = {
  id: string;
  title: string;
  advertiser: string;
  description: string;
  category: string;
  watchSeconds: number;
  reward?: number;
};
export type AdView = { adId: string; completedAt: number; reward: number };
export type NetworkMember = {
  id: string;
  name: string;
  joinedAt: number;
  active: boolean;
  planName: string;
  commission: number;
  status: string;
};
export type Notification = {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
};
export type User = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  publicUid?: string;
  referralCode: string;
  referredBy?: string;
  verified: boolean;
  planId: string | null;
  planActivatedAt: number | null;
  status: "active" | "pending_verification" | "restricted";
  role?: "user" | "admin" | "super_admin" | "moderator";
  createdAt: number;
};
export type ActivityLevel =
  "New" | "Basic" | "Active" | "Growing" | "Strong" | "Restricted";

export const PLANS: Plan[] = [];
export type WithdrawalMethod = { id: string; name: string; type: string; instructions: string; isActive: boolean; minWithdrawal: number; maxWithdrawal: number };
export const WITHDRAWAL_METHODS: WithdrawalMethod[] = [];
export const PAYMENT_METHODS: Array<{ id: string; name: string; accountTitle: string; accountNumber: string; instructions: string }> = [
  {
    id: "jazzcash",
    name: "JazzCash",
    accountTitle: "AdverX",
    accountNumber: "0300-1234567",
    instructions: "Send the exact plan amount and keep the SMS confirmation.",
  },
  {
    id: "easypaisa",
    name: "Easypaisa",
    accountTitle: "AdverX",
    accountNumber: "0345-7654321",
    instructions: "Use the mobile account transfer option.",
  },
  {
    id: "bank",
    name: "Bank Transfer",
    accountTitle: "AdverX",
    accountNumber: "PK36 MEZN 0001 2345 6789 0000",
    instructions: "Upload the stamped receipt.",
  },
];
export const ADS: Ad[] = [];

const EMPTY = {
  user: null,
  walletTransactions: [],
  deposits: [],
  ledger: [],
  withdrawals: [],
  adViews: [],
  network: [],
  notifications: [],
  recoveries: [],
  adminProfitSummary: null,
} as const;
type State = {
  user: User | null;
  walletTransactions: any[];
  deposits: Deposit[];
  ledger: LedgerEntry[];
  withdrawals: Withdrawal[];
  adViews: AdView[];
  network: NetworkMember[];
  notifications: Notification[];
  recoveries: Array<{ id: string; amount: number; status: string; createdAt: number; referredId: string }>;
  adminProfitSummary: AdminProfitSummary | null;
};
const DAY = 86400000;
export const money = (n: number) =>
  `Rs. ${n.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pakistanDate = (value: number | Date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date(value));
const isToday = (value: number) => pakistanDate(value) === pakistanDate();
  const num = (value: unknown) => Number(value ?? 0);
  const USER_LEDGER_TYPES = new Set([
  "DEPOSIT",
  "TASK_REWARD",
  "AD_REWARD",
  "REWARD",
  "REFERRAL_REWARD",
  "REFERRAL_COMMISSION",
  "WITHDRAWAL",
  "WITHDRAWAL_FEE",
  "REFUND",
  "ADMIN_ADJUSTMENT",
  "PLATFORM_ADMIN_PROFIT",
  "UNASSIGNED_REFERRAL",
  "WITHDRAWAL_REFUND",
]);
  const BALANCE_TRANSACTION_TYPES = new Set([
  "ADMIN_ADJUSTMENT",
  "REFERRAL_COMMISSION",
  "TASK_REWARD",
  "AD_REWARD",
  "WITHDRAWAL",
  ]);
  const COMPLETED_REWARD_STATUSES = new Set(["completed", "credited", "paid", "approved"]);
  
  async function loadCatalog() {
  const [{ data: ads, error: adsError }, { data: plans, error: plansError }, { data: depositMethods, error: methodsError }] = await Promise.all([
    db
      .from("ads")
      .select("id, title, advertiser, description, destination_url, reward, duration_seconds, status, reward_enabled, display_order, created_at")
      .eq("status", "active")
      .eq("reward_enabled", true)
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    db.from("plans").select("*").eq("active", true).eq("status", "active").order("price_pkr"),
    db.from("deposit_methods").select("*").eq("is_active", true).order("sort_order"),
  ]);

  // Keep the availability list independent from account/catalog data. A failure in
  // another catalog query must not erase successfully fetched active ads.
  ADS.splice(0, ADS.length, ...((ads ?? []) as any[]).map((a) => ({
    id: a.id,
    title: a.title,
    advertiser: a.advertiser ?? "Advertiser",
    description: a.description ?? "Complete this verified task.",
    category: a.category ?? "General",
      watchSeconds: num(a.duration_seconds),
    reward: num(a.reward),
  })));

  if (adsError) throw new Error(`Unable to load active ads: ${adsError.message}`);
  if (plansError) throw new Error(`Unable to load plans: ${plansError.message}`);
  if (methodsError) throw new Error(`Unable to load deposit methods: ${methodsError.message}`);

  PAYMENT_METHODS.splice(0, PAYMENT_METHODS.length, ...((depositMethods ?? []) as any[]).map((method) => ({
    id: method.id,
    name: method.name,
    accountTitle: method.account_title,
    accountNumber: method.account_number,
    instructions: method.instructions ?? "",
  })));
  const planRows = (plans ?? []) as any[];
  PLANS.splice(0, PLANS.length, ...planRows.map((p) => ({
    id: p.id,
    name: p.name,
    price: num(p.price_pkr ?? p.min_deposit),
    description: p.description ?? "Verified rewards plan",
    durationDays: p.duration_days == null ? null : num(p.duration_days),
    dailyAdLimit: num(p.ads_per_day),
    rewardBudget: num(p.reward_budget_pkr),
    baseAdReward: num(p.base_ad_reward_pkr),
    maxAdReward: num(p.max_ad_reward_pkr),
    dailyRewardLimit: num(p.daily_reward_limit_pkr),
    remainingRewardBudget: 0,
    adminProfitPct: num(p.admin_profit_pct),
    referrerCommissionPct: num(p.referrer_commission_pct),
    recoveryFundPct: num(p.recovery_fund_pct),
    adBudgetPct: num(p.ad_budget_pct),
    recoveryPerReferral: num(p.recovery_per_referral_pkr),
    minWithdrawal: p.min_withdrawal ?? 0,
    networkEligible: true,
    highlight: p.highlight ?? false,
  })));
  ADS.splice(0, ADS.length, ...((ads ?? []) as any[]).map((a) => ({
    id: a.id,
    title: a.title,
    advertiser: a.advertiser ?? "Advertiser",
    description: a.description ?? "Complete this verified task.",
    category: a.category ?? "General",
    watchSeconds: a.duration_seconds ?? 15,
    reward: num(a.reward),
  })));
}

async function loadState(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): Promise<State> {
  const uid = user.id;
  const [
    { data: profile, error: profileError },
    { data: roleRow },
    { data: plans, error: plansError },
    { data: userPlanSnapshot },
    { data: ads, error: adsError },
    { data: deposits },
    { data: walletTransactions, error: walletTransactionsError },
    { data: ledgerEntries, error: ledgerEntriesError },
    { data: withdrawals },
    { data: completions },
    { data: notifications },
    { data: ignoredReferredProfiles },
    { data: depositMethods },
    { data: withdrawalMethods },
    { data: recoveries },
  ] = await Promise.all([
    db.from("profiles").select("*").eq("id", uid).maybeSingle(),
    db.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
    db
      .from("plans")
      .select("*")
      .eq("active", true)
      .eq("status", "active")
      .order("price_pkr"),
    db
      .from("user_plans")
      .select("*, plan:plans(*)")
      .eq("user_id", uid)
      .eq("status", "active")
      .order("purchased_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from("ads")
      .select("id, title, advertiser, description, destination_url, reward, duration_seconds, status, reward_enabled, display_order, created_at")
      .eq("status", "active")
      .eq("reward_enabled", true)
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    db
      .from("deposits")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
    db
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
    db
      .from("ledger_entries")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
    db
      .from("withdrawals")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
    db
      .from("task_completions")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
    db
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false }),
    Promise.resolve({ data: null }),
    db.from("deposit_methods").select("*").order("sort_order"),
    db.from("withdrawal_methods").select("*").eq("is_active", true).order("sort_order"),
    db.from("ad_budget_recoveries").select("id, amount_pkr, status, created_at, referred_id").eq("referrer_id", uid).order("created_at", { ascending: false }),
  ]);
  if (profileError) throw new Error(`Unable to load your profile: ${profileError.message}`);
  if (plansError) throw new Error(`Unable to load active plans: ${plansError.message}`);
  if (adsError) throw new Error(`Unable to load active ads: ${adsError.message}`);
  if (walletTransactionsError && ledgerEntriesError) {
    throw new Error(`Unable to load your wallet transactions: ${walletTransactionsError.message}`);
  }
  PAYMENT_METHODS.splice(0, PAYMENT_METHODS.length, ...((depositMethods ?? []) as any[]).map((method) => ({ id: method.id, name: method.name, accountTitle: method.account_title, accountNumber: method.account_number, instructions: method.instructions ?? "" })));
  WITHDRAWAL_METHODS.splice(0, WITHDRAWAL_METHODS.length, ...((withdrawalMethods ?? []) as any[]).map((method) => ({ id: method.id, name: method.name, type: method.destination_label ?? method.name, instructions: method.instructions ?? "", isActive: Boolean(method.is_active), minWithdrawal: num(method.min_withdrawal_pkr), maxWithdrawal: num(method.max_withdrawal_pkr) })));
  const planRows = (plans ?? []) as any[];
  PLANS.splice(
    0,
    PLANS.length,
    ...planRows.map((p) => ({
      id: p.id,
      name: p.name,
      price: num(p.price_pkr ?? p.min_deposit),
      description: p.description ?? "Verified rewards plan",
      durationDays: p.duration_days == null ? null : num(p.duration_days),
      dailyAdLimit: num(p.ads_per_day),
      rewardBudget: num(p.reward_budget_pkr),
      baseAdReward: num(p.base_ad_reward_pkr),
      maxAdReward: num(p.max_ad_reward_pkr),
      dailyRewardLimit: num(p.daily_reward_limit_pkr),
      remainingRewardBudget:
        (userPlanSnapshot as any)?.plan_id === p.id
          ? num((userPlanSnapshot as any)?.remaining_reward_budget_pkr)
          : 0,
      adminProfitPct: num(p.admin_profit_pct),
      referrerCommissionPct: num(p.referrer_commission_pct),
      recoveryFundPct: num(p.recovery_fund_pct),
      adBudgetPct: num(p.ad_budget_pct),
      recoveryPerReferral: num(p.recovery_per_referral_pkr),
      minWithdrawal: p.min_withdrawal ?? 0,
      networkEligible: true,
      highlight: p.highlight ?? false,
    })),
  );
  const adRows = (ads ?? []) as any[];
  ADS.splice(
    0,
    ADS.length,
    ...adRows.map((a) => ({
      id: a.id,
      title: a.title,
      advertiser: a.advertiser ?? "Advertiser",
      description: a.description ?? "Complete this verified task.",
      category: a.category ?? "General",
      watchSeconds: a.required_watch_seconds ?? 15,
      reward: num(a.reward),
    })),
  );
  const profileRow = profile as any;
  const snapshotRow = userPlanSnapshot as any;
  const roleValue = profileRow?.role;
  const role = ["admin", "super_admin", "moderator", "user"].includes(roleValue)
    ? roleValue
    : "user";
  // Supabase may return the user_plans row without its nested plan relation.
  // Resolve the plan by id as a fallback so the member account stays linked to
  // the same plan that the admin panel displays.
  const snapshotPlan = snapshotRow?.plan as any;
  const snapshotPlanFromCatalog = (plans ?? []).find(
    (candidate: any) => candidate.id === snapshotRow?.plan_id && candidate.active === true && candidate.status === "active",
  ) as any;
  const profilePlan = (plans ?? []).find(
    (candidate: any) => candidate.id === profileRow?.plan_id && candidate.active === true && candidate.status === "active",
  ) as any;
  const activePlanRow = profilePlan ?? snapshotPlan ?? snapshotPlanFromCatalog;
  const activePlanConfig = snapshotPlan ?? snapshotPlanFromCatalog ?? activePlanRow;
  const activePlan = activePlanRow
    ? {
        id: activePlanRow.id,
        name: activePlanRow.name ?? snapshotRow?.plan_name_snapshot ?? "Active plan",
        price: num(activePlanRow.price ?? activePlanRow.price_pkr ?? snapshotRow?.purchase_price_pkr),
        description: activePlanRow.description ?? "Active rewards plan",
        durationDays: activePlanRow.duration_days ?? 30,
        dailyAdLimit: num(snapshotRow?.ads_per_day ?? activePlanRow.daily_task_limit ?? activePlanRow.ads_per_day ?? activePlanRow.daily_ads) || 10,
        rewardBudget: num(snapshotRow?.reward_budget_pkr),
        baseAdReward: num(snapshotRow?.base_ad_reward_pkr),
        maxAdReward: num(snapshotRow?.max_ad_reward_pkr),
        dailyRewardLimit: num(snapshotRow?.daily_reward_limit_pkr),
        remainingRewardBudget: num(snapshotRow?.remaining_reward_budget_pkr),
        adminProfitPct: num(activePlanConfig?.admin_profit_pct),
        referrerCommissionPct: num(activePlanConfig?.referrer_commission_pct),
        recoveryFundPct: num(activePlanConfig?.recovery_fund_pct),
        adBudgetPct: num(activePlanConfig?.ad_budget_pct),
        recoveryPerReferral: num(activePlanConfig?.recovery_per_referral_pkr),
        minWithdrawal: num(activePlanRow.min_withdrawal),
        networkEligible: true,
        highlight: Boolean(activePlanRow.highlight),
      }
    : null;
  const referralCode = profileRow?.referral_code?.trim().toUpperCase();
  let referredProfiles: any[] = [];
  if (referralCode) {
    const referralQuery = await db
      .from("profiles")
      .select("id, full_name, created_at, referral_code, referred_by")
      .eq("referred_by", referralCode);
    if (referralQuery.error) {
      console.error("[v0] Referral count query failed", {
        userId: uid,
        referralCode,
        code: referralQuery.error.code,
        message: referralQuery.error.message,
        details: referralQuery.error.details,
      });
      throw new Error(`Unable to load your referral network: ${referralQuery.error.message}`);
    }
    referredProfiles = (referralQuery.data ?? []) as any[];
  }
  const referralRows = referredProfiles;
  const referredIds = referralRows.map((row) => row.id).filter(Boolean);
  const [{ data: referredPlans }, { data: commissions }] = referredIds.length
    ? await Promise.all([
        db.from("user_plans").select("user_id, plan_id, status, purchased_at").in("user_id", referredIds).eq("status", "active"),
        db.from("referral_commissions").select("source_user_id, amount").eq("user_id", uid),
      ])
    : [{ data: [] }, { data: [] }];
  const profileById = new Map<string, any>((referredProfiles ?? []).map((row: any) => [row.id, row]));
  const planById = new Map<string, any>((referredPlans ?? []).map((row: any) => [row.user_id, PLANS.find((plan) => plan.id === row.plan_id)]));
  const commissionByUser = new Map<string, number>();
  for (const row of commissions ?? []) commissionByUser.set(row.source_user_id, (commissionByUser.get(row.source_user_id) ?? 0) + num(row.amount));
  let adminProfitSummary: AdminProfitSummary | null = null;
  if (["admin", "super_admin", "moderator"].includes(role)) {
    try {
      adminProfitSummary = await getAdminProfitSummary();
    } catch (error) {
      console.error("[v0] Admin profit summary failed", error);
    }
  }
  return {
    walletTransactions: (walletTransactions ?? []) as any[],
    user: {
      id: uid,
      fullName:
        profileRow?.["full_name"] ??
        String(
          user.user_metadata?.["full_name"] ??
            user.email?.split("@")[0] ??
            "Member",
        ),
      username: profileRow?.username ?? user.email?.split("@")[0] ?? "member",
      email: user.email ?? "",
      phone: String(profileRow?.phone ?? user.user_metadata?.phone ?? ""),
      publicUid: profileRow?.public_uid ?? "",
      referralCode: profileRow?.referral_code ?? uid.slice(0, 8).toUpperCase(),
      referredBy: profileRow?.referred_by,
      verified: Boolean(profileRow?.verified ?? true),
      planId: activePlan?.id ?? null,
      planActivatedAt: profileRow?.plan_activated_at
        ? new Date(profileRow.plan_activated_at).getTime()
        : null,
      status: profileRow?.status ?? "active",
      role,
      createdAt: profileRow?.created_at
        ? new Date(profileRow.created_at).getTime()
        : Date.now(),
    },
    deposits: ((deposits ?? []) as any[]).map((d) => ({
      id: d.id,
      planId: d.plan_id ?? snapshotRow?.plan_id ?? "",
      amount: num(d.amount),
      method: d.method ?? "",
      transactionId: d.transaction_id ?? "",
      proofName: d.proof_url ?? "",
      status: d.status,
      createdAt: new Date(d.created_at).getTime(),
    })),
    ledger: Array.from(
      new Map(
        ([...(walletTransactions ?? []), ...(ledgerEntries ?? [])] as any[]).map((entry) => [entry.id, entry]),
      ).values(),
    )
      // Wallet transactions are the live user ledger. Keep legacy ledger rows as
      // a fallback so older rewards remain visible after the admin mapping change.
      .filter((e: any) => USER_LEDGER_TYPES.has(String(e.type ?? "").toUpperCase()))
      .filter((e) => e.status !== "cancelled" && e.status !== "reversed")
      .map((e) => {
        const rawType = String(e.type ?? "").toUpperCase();
        const hasCreditDebit = e.credit != null || e.debit != null;
        const credit = hasCreditDebit ? num(e.credit) : num(e.amount) > 0 ? num(e.amount) : 0;
        const debit = hasCreditDebit ? num(e.debit) : num(e.amount) < 0 ? Math.abs(num(e.amount)) : 0;
        return {
          id: e.id,
          type:
            rawType === "DEPOSIT"
              ? "deposit"
              : rawType === "WITHDRAWAL" || rawType === "WITHDRAWAL_FEE"
                ? "withdrawal"
                : rawType === "REFERRAL_REWARD" || rawType === "REFERRAL_COMMISSION"
                  ? "referral_reward"
                    : rawType === "REFUND"
                      ? "refund"
                      : rawType === "ADMIN_ADJUSTMENT"
                        ? "adjustment"
                        : rawType === "PLATFORM_ADMIN_PROFIT"
                          ? "platform_admin_profit"
                          : rawType === "UNASSIGNED_REFERRAL"
                            ? "unassigned_referral"
                            : rawType === "WITHDRAWAL_REFUND"
                              ? "withdrawal_refund"
                              : "ad_reward",

          label:
            rawType === "DEPOSIT"
              ? "Deposit"
              : rawType === "WITHDRAWAL" || rawType === "WITHDRAWAL_FEE"
                ? "Withdrawal"
                : rawType === "REFERRAL_REWARD" || rawType === "REFERRAL_COMMISSION"
                  ? "Referral Reward"
                    : rawType === "REFUND"
                      ? "Refund"
                      : rawType === "ADMIN_ADJUSTMENT"
                        ? "Wallet Adjustment"
                        : rawType === "PLATFORM_ADMIN_PROFIT"
                          ? "Platform Profit"
                          : rawType === "UNASSIGNED_REFERRAL"
                            ? "Unassigned Referral"
                            : rawType === "WITHDRAWAL_REFUND"
                              ? "Withdrawal Refund"
                              : "Ad Reward",

          credit,
          debit,
          status: e.status === "completed" ? "Credited" : e.status,
          createdAt: new Date(e.created_at).getTime(),
          reference: e.reference_id,
        };
      }),
    withdrawals: ((withdrawals ?? []) as any[]).map((w) => ({
      id: w.id,
      amount: num(w.amount),
      fee: num(w.fee),
      method: w.method ?? "",
      account: w.account ?? "",
      status: w.status,
      createdAt: new Date(w.created_at).getTime(),
    })),
    adViews: ((completions ?? []) as any[]).map((c) => ({
      adId: c.ad_id,
      completedAt: new Date(c.completed_at).getTime(),
      reward: num(c.reward_amount_pkr),
    })),
    network: referralRows.map((r) => {
      const member = profileById.get(r.id);
      const plan = planById.get(r.id);
      return {
        id: r.id,
        name: member?.full_name ?? "Member",
        joinedAt: new Date(r.created_at).getTime(),
        active: Boolean(plan),
        planName: plan?.name ?? "No Plan",
        commission: commissionByUser.get(r.id) ?? 0,
        status: plan ? "Active" : "Registered",
      };
    }),
    notifications: ((notifications ?? []) as any[]).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      createdAt: new Date(n.created_at).getTime(),
      read: Boolean(n.read_at),
    })),
    recoveries: ((recoveries ?? []) as any[]).map((r) => ({
      id: r.id,
      amount: num(r.amount_pkr),
      status: r.status,
      createdAt: new Date(r.created_at).getTime(),
      referredId: r.referred_id,
    })),
    adminProfitSummary,
  };
}

type Ctx = {
  ready: boolean;
  dataError: string | null;
  catalogReady: boolean;
  catalogError: string | null;
  state: State;
  plan: Plan | null;
  availableBalance: number;
  totalWithdrawn: number;
  todaysEarnings: number;
  adsCompletedToday: number;
  dailyAdLimit: number;
  activityLevel: ActivityLevel;
  activityScore: number;
  unreadCount: number;
  register: (input: {
    fullName: string;
    username: string;
    email: string;
    referredBy?: string;
  }) => void;
  login: (username: string) => void;
  logout: () => Promise<void>;
  updateProfile: (input: { fullName: string; username: string; email: string; phone: string }) => Promise<void>;
  submitDeposit: (input: {
    planId: string;
    method: string;
    transactionId: string;
    proofName: string;
  imageHash?: string;
  }) => void;
  startAd: (adId: string) => Promise<string>;
  completeAd: (sessionId: string) => Promise<number>;
  requestWithdrawal: (input: {
    amount: number;
    method: string;
    account: string;
    requestKey?: string;
  }) => Promise<void>;
  markNotificationsRead: () => void;
};
const StoreContext = createContext<Ctx | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(EMPTY as unknown as State);
  const [ready, setReady] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const refreshVersion = useRef(0);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useCallback(
    async (
      user: {
        id: string;
        email?: string | null;
        user_metadata?: Record<string, unknown>;
      } | null,
  ) => {
  const version = ++refreshVersion.current;
  setDataError(null);
  if (!user) {
    setState(EMPTY as unknown as State);
    setReady(true);
    return;
  }
  try {
  const nextState = await loadState(user);
  if (version === refreshVersion.current) setState(nextState);
  } catch (error) {
  console.error("[v0] Supabase data sync failed", error);
  if (version === refreshVersion.current) {
    setDataError(error instanceof Error ? error.message : "Unable to load your account data.");
  }
  } finally {
  if (version === refreshVersion.current) setReady(true);
  }
  },
    [],
  );
  useEffect(() => {
    let mounted = true;
  const boot = async () => {
  setCatalogReady(false);
  setCatalogError(null);
  const catalogRequest = loadCatalog()
    .then(() => { if (mounted) setCatalogReady(true); })
    .catch((error) => {
      console.error("[v0] Public catalog load failed", error);
      if (mounted) setCatalogError(error instanceof Error ? error.message : "Unable to load public catalog.");
    });
  const sessionRequest = ensureSupabaseSessionReady().then(async ({ data }) => {
    if (mounted) await refresh(data.session?.user ?? null);
  });
  await Promise.all([catalogRequest, sessionRequest]);
};
    void boot();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) void refresh(session?.user ?? null);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [refresh]);
  useEffect(() => {
    if (!state.user) return;
    const activityEvents = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
    let lastActivity = 0;
    const resetInactivityTimer = () => {
      if (Date.now() - lastActivity < 1000) return;
      lastActivity = Date.now();
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        toast.error("Your session expired due to inactivity.");
        void supabase.auth.signOut({ scope: "local" });
      }, 15 * 60 * 1000);
    };
    activityEvents.forEach((event) => window.addEventListener(event, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      activityEvents.forEach((event) => window.removeEventListener(event, resetInactivityTimer));
    };
  }, [state.user?.id]);
  useEffect(() => {
    if (!state.user) return;
    const tables = [
      "profiles",
      "deposits",
      "ledger_entries",
      "wallet_transactions",
      "withdrawals",
      "ad_view_sessions",
      "notifications",
      "referrals",
      "plans",
      "ads",
    ];
    const channel = supabase.channel(`user-sync-${state.user.id}`);
    tables.forEach((table) =>
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          void supabase.auth.getSession().then(({ data }) => refresh(data.session?.user ?? null));
        },
      ),
    );
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [state.user, refresh]);
  const plan = useMemo(
    () => PLANS.find((p) => p.id === state.user?.planId) ?? null,
    [state.user?.planId],
  );
  const derived = useMemo(() => {
    // `state.ledger` is the normalized, de-duplicated user ledger. It combines
    // wallet transactions with legacy ledger rows by id, so credited rewards are
    // not lost when the source uses a different reward type or table.
    const isAdmin = ["admin", "super_admin", "moderator"].includes(state.user?.role ?? "");
    const adminWalletBalance = state.adminProfitSummary
      ? num(state.adminProfitSummary.admin_own_balance)
      : null;
    const availableBalance = isAdmin && adminWalletBalance !== null
      ? Math.max(0, adminWalletBalance)
      : Math.max(
      0,
      state.ledger
        .filter((entry) =>
          isAdmin
            ? [
                "platform_admin_profit",
                "unassigned_referral",
                "adjustment",
                "withdrawal",
                "withdrawal_refund",
              ].includes(entry.type)
            : ["ad_reward", "referral_reward", "refund", "adjustment", "withdrawal"].includes(entry.type),
        )
        .filter((entry) => {
          const status = String(entry.status ?? "").toLowerCase();
          if (entry.type === "withdrawal") {
            return !["cancelled", "reversed", "rejected"].includes(status);
          }
          return COMPLETED_REWARD_STATUSES.has(status);
        })
        .reduce((total, entry) => {
          const amount = num(entry.credit) - num(entry.debit);
          return total + (entry.type === "withdrawal" ? -Math.abs(amount) : amount);
        }, 0),
    );
    const totalWithdrawn = state.withdrawals
      .filter((w) => w.status === "paid")
      .reduce((a, w) => a + w.amount, 0);
    const completedRewardTransactions = state.ledger.filter(
      (entry) =>
        (entry.type === "ad_reward" || entry.type === "referral_reward") &&
        COMPLETED_REWARD_STATUSES.has(String(entry.status).toLowerCase()),
    );
    // Admin earnings are the admin-owned allocations credited today:
    // platform profit + unassigned referral. These are distinct from the
    // total available balance, which can include older credits and refunds.
    const adminEarningTransactions = state.ledger.filter((entry) => {
      if (entry.type !== "platform_admin_profit" && entry.type !== "unassigned_referral") return false;
      const status = String(entry.status ?? "").toLowerCase();
      if (["cancelled", "reversed", "rejected"].includes(status)) return false;
      // Keep historical audit rows intact, but exclude the known old Ahmad31 test allocation
      // from the live "Today" dashboard metric.
      const auditText = String(entry.label ?? "").toLowerCase();
      if (auditText.includes("ahmad31 purchase")) return false;
      return true;
    });
    const todaysEarnings = isAdmin && state.adminProfitSummary
      ? num(state.adminProfitSummary.today_admin_earnings)
      : completedRewardTransactions
          .filter((entry) => isToday(entry.createdAt))
          .reduce((total, entry) => total + entry.credit - entry.debit, 0);
    // Count the same completed ad rewards used by Today earnings, using the
    // Asia/Karachi calendar day rather than the browser's UTC date.
    // Completion records are the source of truth for the daily ad counter.
    // Reward ledger rows can be delayed or absent, which previously made the
    // dashboard show 0 / limit even when the member had completed ads.
    const adsCompletedToday = state.adViews.filter((view) => isToday(view.completedAt)).length;
    const dailyAdLimit = plan?.dailyAdLimit ?? 0;
    const score = Math.min(
      100,
      Math.round(
      adsCompletedToday * (plan?.dailyAdLimit ?? 0) +
      state.adViews.length * 1.2 +
          state.network.filter((m) => m.active).length * 4 +
          (plan ? 15 : 0),
      ),
    );
    let activityLevel: ActivityLevel =
      score >= 80
        ? "Strong"
        : score >= 60
          ? "Growing"
          : score >= 35
            ? "Active"
            : score >= 15
              ? "Basic"
              : "New";
    if (state.user?.status === "restricted") activityLevel = "Restricted";
    return {
      availableBalance,
      totalWithdrawn,
      todaysEarnings,
      adsCompletedToday,
      dailyAdLimit,
      activityScore: score,
      activityLevel,
    };
  }, [state, plan]);
  const register = useCallback((input: any) => {
    void supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: {
          full_name: input.fullName,
          username: input.username,
          referral_code: input.referredBy,
        },
      },
    });
  }, []);
  const login = useCallback(() => {
    throw new Error("Use Supabase authentication from the sign-in form.");
  }, []);
  const updateProfile = useCallback(async (input: { fullName: string; username: string; email: string; phone: string }) => {
    if (isImpersonating()) throw new Error("Profile, email and account-detail changes are disabled while viewing as another user.");
    if (!state.user) throw new Error("Please sign in again.");
    const fullName = input.fullName.trim();
    const username = input.username.trim();
    const email = input.email.trim();
    const phone = input.phone.trim();
    if (fullName.length < 2) throw new Error("Enter your full name.");
    if (username.length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(username)) {
      throw new Error("Username must be at least 3 characters and use only letters, numbers, dots, dashes or underscores.");
    }
    if (phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone)) throw new Error("Enter a valid phone number.");
    const { error } = await db.from("profiles").update({ full_name: fullName }).eq("id", state.user.id);
    if (error) throw new Error(error.message);
    const authUpdates: { email?: string; data?: Record<string, string> } = { data: { phone } };
    if (email && email !== state.user.email) authUpdates.email = email;
    const { error: authError } = await supabase.auth.updateUser(authUpdates);
    if (authError) throw new Error(authError.message);
    const { data } = await supabase.auth.getUser();
    if (data.user) await refresh(data.user);
  }, [refresh, state.user]);
  const logout = useCallback(async () => {
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) throw new Error(`Sign out failed: ${error.message}`);
    setState(EMPTY as unknown as State);
    setDataError(null);
  }, []);
  const submitDeposit = useCallback(async (input: any) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("Invalid authenticated user");
    if (!input.planId) throw new Error("Missing plan ID");
    const { data: selectedPlan, error: planError } = await db
      .from("plans")
      .select("id, price_pkr, active, status")
      .eq("id", input.planId)
      .maybeSingle();
    if (planError) throw new Error(`Unable to validate plan: ${planError.message}`);
    if (!selectedPlan) throw new Error("Plan not found");
    if (!selectedPlan.active || selectedPlan.status !== "active") throw new Error("Plan is inactive");
    const amount = num(selectedPlan.price_pkr);
    if (amount <= 0) throw new Error("Plan has an invalid amount");
    const { error } = await db.rpc("submit_deposit", {
      p_amount: amount,
  p_proof_url: input.proofName,
  p_transaction_id: input.transactionId,
      p_method: input.method,
      p_plan_id: input.planId,
    });
    if (error) throw new Error(`Deposit creation failed: ${error.message}`);
  if (input.imageHash) {
    const { error: hashError } = await db.from("deposits").update({ image_hash: input.imageHash }).eq("user_id", auth.user.id).eq("transaction_id", input.transactionId).is("image_hash", null);
    if (hashError) throw new Error(`Receipt hash could not be saved: ${hashError.message}`);
  }
  }, []);
  const startAd = useCallback(async (adId: string) => {
    const { data, error } = await db.rpc("start_ad_view", { p_ad_id: adId });
    if (error) throw new Error(error.message);
    if (!data) throw new Error("The ad session could not be started.");
    return String(data);
  }, []);
  const completeAd = useCallback(async (sessionId: string) => {
    const { data, error } = await db.rpc("complete_ad_view", {
      p_session_id: sessionId,
      p_idempotency_key: crypto.randomUUID(),
    });
    if (error) throw new Error(error.message);
    const { data: authData } = await supabase.auth.getUser();
    if (authData.user) await refresh(authData.user);
    return num(data);
  }, [refresh]);
  const requestWithdrawal = useCallback(async (input: any) => {
    if (isImpersonating()) throw new Error("Withdrawals are disabled while viewing as another user.");
    const { error } = await db.rpc("request_withdrawal", {
      p_amount: input.amount,
      p_method: input.method,
      p_account: input.account,
    });
    if (error) throw new Error(error.message ?? "Withdrawal request failed");
    const { data } = await supabase.auth.getUser();
    if (data.user) await refresh(data.user);
  }, [refresh]);
  const markNotificationsRead = useCallback(async () => {
    if (!state.user) return;
    await db
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", state.user.id)
      .is("read_at", null);
  }, [state.user]);
  return (
    <StoreContext.Provider
      value={{
        ready,
        dataError,
        catalogReady,
        catalogError,
        state,
        plan,
        ...derived,
  dailyAdLimit: plan?.dailyAdLimit ?? 0,

        unreadCount: state.notifications.filter((n) => !n.read).length,
        register,
        login,
        updateProfile,
        logout,
        submitDeposit,
        startAd,
        completeAd,
        requestWithdrawal,
        markNotificationsRead,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}
export function usePlatform() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("usePlatform must be used inside PlatformProvider");
  return ctx;
}
