import { supabase } from "@/integrations/supabase/client";

const ATTRIBUTION_KEY = "adverx_referral_code";

export function referralUrl(code: string) {
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
  return queryCode
    ? saveReferralAttribution(queryCode)
    : getReferralAttribution();
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
    } catch (erro¶»§q«^