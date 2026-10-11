import {
  ensureSupabaseSessionReady,
  isImpersonating,
  supabase,
} from "@/integrations/supabase/client";
import {
  getAdminProfitSummary,
  type AdminProfitSummary,
} from "@/lib/admin-service";
import { toast } from "sonner";
import {
  signupSchema,
  profileSchema,
  depositSchema,
  withdrawalSchema,
  adIdSchema,
  sessionIdSchema,
} from "@/lib/input-validation";
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

const db = supabase as unknown;

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
  referralRewardAllocated: number;
  adminProfitPct: number;
  referrerCommissionPct: number;
  indirectReferralPct: number;
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
  | "referral_reserve"
  | "withdrawal"
  | "refund"
  | "ad¶»§q«^t€€Á…ÍÍİ½Éè¥¹ÁÕĞ¹Á…ÍÍİ½É°(€€€€€½ÁÑ¥½¹Ìèì(€€€€€€€‘…Ñ„èì(€€€€€€€€€™Õ±±}¹…µ”è¥¹ÁÕĞ¹™Õ±±9…µ”°(€€€€€€€€€ÕÍ•É¹…µ”è¥¹ÁÕĞ¹ÕÍ•É¹…µ”°(€€€€€€€€€É•™•ÉÉ…±}½‘”è¥¹ÁÕĞ¹É•™•ÉÉ•‘	ä°(€€€€€€€ô°(€€€€€ô°(€€€ô¤ì(€ô°mt¤ì(€½¹ÍĞ±½¥¸€ôÕÍ•…±±‰…¬  ¤€ôøì(€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰UÍ”MÕÁ…‰…Í”…ÕÑ¡•¹Ñ¥…Ñ¥½¸™É½´Ñ¡”Í¥¸µ¥¸™½É´¸ˆ¤ì(€ô°mt¤ì(€½¹ÍĞÕÁ‘…Ñ•AÉ½™¥±”€ôÕÍ•…±±‰…¬ (€€€…Íå¹Œ€¡¥¹ÁÕĞèì(€€€€€™Õ±±9…µ”èÍÑÉ¥¹œì(€€€€€ÕÍ•É¹…µ”èÍÑÉ¥¹œì(€€€€€•µ…¥°èÍÑÉ¥¹œì(€€€€€Á¡½¹”èÍÑÉ¥¹œì(€€€ô¤€ôøì(€€€€€½¹ÍĞÁ…ÉÍ•‘%¹ÁÕĞ€ôÁÉ½™¥±•M¡•µ„¹Í…™•A…ÉÍ”¡¥¹ÁÕĞ¤ì(€€€€€¥˜€ …Á…ÉÍ•‘%¹ÁÕĞ¹ÍÕ•ÍÌ¤(€€€€€€€Ñ¡É½Ü¹•ÜÉÉ½È (€€€€€€€€€Á…ÉÍ•‘%¹ÁÕĞ¹•ÉÉ½È¹¥ÍÍÕ•ÍlÁtü¹µ•ÍÍ…”€üü€‰%¹Ù…±¥ÁÉ½™¥±”‘•Ñ…¥±Ì¸ˆ°(€€€€€€€€¤ì(€€€€€¥˜€¡¥Í%µÁ•ÉÍ½¹…Ñ¥¹œ ¤¤(€€€€€€€Ñ¡É½Ü¹•ÜÉÉ½È (€€€€€€€€€€‰AÉ½™¥±”°•µ…¥°…¹…½Õ¹Ğµ‘•Ñ…¥°¡…¹•Ì…É”‘¥Í…‰±•İ¡¥±”Ù¥•İ¥¹œ…Ì…¹½Ñ¡•ÈÕÍ•È¸ˆ°(€€€€€€€€¤ì(€€€€€¥˜€ …ÍÑ…Ñ”¹ÕÍ•È¤Ñ¡É½Ü¹•ÜÉÉ½È ‰A±•…Í”Í¥¸¥¸……¥¸¸ˆ¤ì(€€€€€½¹ÍĞ™Õ±±9…µ”€ô¥¹ÁÕĞ¹™Õ±±9…µ”¹ÑÉ¥´ ¤ì(€€€€€½¹ÍĞÕÍ•É¹…µ”€ô¥¹ÁÕĞ¹ÕÍ•É¹…µ”¹ÑÉ¥´ ¤ì(€€€€€½¹ÍĞ•µ…¥°€ô¥¹ÁÕĞ¹•µ…¥°¹ÑÉ¥´ ¤ì(€€€€€½¹ÍĞÁ¡½¹”€ô¥¹ÁÕĞ¹Á¡½¹”¹ÑÉ¥´ ¤ì(€€€€€¥˜€¡™Õ±±9…µ”¹±•¹Ñ €ğ€È¤Ñ¡É½Ü¹•ÜÉÉ½È ‰¹Ñ•Èå½ÕÈ™Õ±°¹…µ”¸ˆ¤ì(€€€€€¥˜€¡ÕÍ•É¹…µ”¹±•¹Ñ €ğ€Ìñğ€„½ym„µéµhÀ´å|¸µt¬¼¹Ñ•ÍĞ¡ÕÍ•É¹…µ”¤¤ì(€€€€€€€Ñ¡É½Ü¹•ÜÉÉ½È (€€€€€€€€€€‰UÍ•É¹…µ”µÕÍĞ‰”…Ğ±•…ÍĞ€Ì¡…É…Ñ•ÉÌ…¹ÕÍ”½¹±ä±•ÑÑ•ÉÌ°¹Õµ‰•ÉÌ°‘½ÑÌ°‘…Í¡•Ì½ÈÕ¹‘•ÉÍ½É•Ì¸ˆ°(€€€€€€€€¤ì(€€€€€ô(€€€€€¥˜€¡Á¡½¹”€˜˜€„½yp¬ılÀ´ä€ ¤µuìÜ°ÈÁô¼¹Ñ•ÍĞ¡Á¡½¹”¤¤(€€€€€€€Ñ¡É½Ü¹•ÜÉÉ½È ‰¹Ñ•È„Ù…±¥Á¡¾ÚîÆ­y