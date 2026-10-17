import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ADMIN_TRUST_COOKIE = "__Host-adverx-admin-trust";
export const ADMIN_TRUST_TTL_SECONDS = 30 * 24 * 60 * 60;

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getTrustedDeviceToken(request: Request = getRequest()) {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_TRUST_COOKIE}=([^;]+)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export async function isTrustedAdminDevice(userId: string, request: Request = getRequest()) {
  const token = getTrustedDeviceToken(request);
  if (!token || !/^[A-Za-z0-9_-]{40,100}$/.test(token)) return false;
  const tokenHash = await sha256Hex(token);
  const { data, error } = await (supabaseAdmin as any)
    .from("admin_trusted_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return !error && Boolean(data);
}

export async function issueTrustedAdminDevice(userId: string) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + ADMIN_TRUST_TTL_SECONDS * 1000).toISOString();
  const { error } = await (supabaseAdmin as any)
    .from("admin_trusted_devices")
    .insert({ user_id: userId, token_hash: tokenHash, expires_at: expiresAt });
  if (error) throw new Error("Unable to save this trusted device.");
  return { token, expiresAt };
}

export async function revokeTrustedAdminDevice(request: Request = getRequest()) {
  const token = getTrustedDeviceToken(request);
  if (token && /^[A-Za-z0-9_-]{40,100}$/.test(token)) {
    const tokenHash = await sha256Hex(token);
    const { error } = await (supabaseAdmin as any)
      .from("admin_trusted_devices")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", tokenHash)
      .is("revoked_at", null);
    if (error) throw new Error("Unable to revoke trusted device.");
  }
}

export function trustedDeviceSetCookie(token: string) {
  return `${ADMIN_TRUST_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${ADMIN_TRUST_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearTrustedDeviceCookie() {
  return `${ADMIN_TRUST_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}
