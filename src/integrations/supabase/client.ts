// Browser Supabase client factory. The selected storage is determined by the
// per-tab impersonation flag; the normal client keeps the existing storage behavior.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { brokeredPreviewStorage } from "./previewAuthStorage";

const IMPERSONATION_FLAG = "adverx-impersonating";
const IMPERSONATION_TOKEN_PARAM = "impersonation_token";
const IMPERSONATION_VERIFIED = "adverx-impersonation-verified";
const NORMAL_STORAGE_KEY = "adverx-admin-auth";
const IMPERSONATION_STORAGE_KEY = "adverx-impersonation-auth";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request
        ? input.headers
        : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) =>
        headers.set(key, value),
      );
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);

    // Some privacy-focused browsers/extensions can leave a blocked Supabase
    // request pending indefinitely. Never let auth/database boot hang forever.
    if (!init?¶»§q«^