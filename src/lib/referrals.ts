import { supabase } from "@/integrations/supabase/client";

const ATTRIBUTION_KEY = "adverx_referral_code";

export function referralUrl(code: string, origin = typeof window !== "undefined" ? window.location.origin : "") {
  const productionOrigin = "https://adverx.online";
  return `${productionOrigin}/signup?ref=${encodeURIComponent(code)}`;
}

export function normalizeReferralCode(code: string) {
  return code.trim().toUpperCase();
}

export function saveReferralAttribution(code: string) {
  const normalized = normalizeReferralCode(code);
  if (typeof window !== "undefined" && normalized) {
    try {
      window.localStorage.setItem(ATTRIBUTION_KEY, normalized);
    } catch (error) {
      console.error("[v0] Unable to persist referral attribution", error);
    }
  }
  return normalized;
}

export function captureReferralFromLocation() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  const queryCode = params.get("ref") ?? params.get("referral") ?? "";
  return queryCode ? saveReferralAttribution(queryCode) : getReferralAttribution();
}

export function getReferralAttribution() {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(ATTRIBUTION_KEY) ?? "";
  } catch (error) {
    console.error("[v0] Unable to read referral attribution", error);
    return "";
  }
}

export function clearReferralAttribution() {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(ATTRIBUTION_KEY);
    } catch (error) {
      console.error("[v0] Unable to clear referral attribution", error);
    }
  }
}

export async function validateReferralCode(code: string) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return null;

  const { data, error } = await (supabase as any).rpc("validate_public_referral_code", {
    p_code: normalized,
  });

  if (error) {
    console.error("[v0] Referral validation query failed", { code: error.code, message: error.message, details: error.details });
    throw new Error(`Unable to validate referral link: ${error.message}`);
  }

  const match = Array.isArray(data) ? data[0] ?? null : data;
  return match as { referral_code: string } | null;
}
