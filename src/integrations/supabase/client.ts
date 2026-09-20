// Browser Supabase client factory. The selected storage is determined by the
// per-tab impersonation flag; the normal client keeps the existing storage behavior.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { brokeredPreviewStorage } from "./previewAuthStorage";

const IMPERSONATION_FLAG = "adverx-impersonating";
const IMPERSONATION_TOKEN_PARAM = "impersonation_token";
const IMPERSONATION_VERIFIED = "adverx-impersonation-verified";

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
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function env(name: string) {
  return (
    import.meta.env[name] ??
    (typeof process !== "undefined" ? process.env[name] : undefined) ??
    ""
  );
}

function createBrowserClient(impersonating: boolean) {
  const SUPABASE_URL =
    env("VITE_SUPABASE_URL") ||
    env("SUPABASE_URL") ||
    env("NEXT_PUBLIC_SUPABASE_URL");

  const SUPABASE_PUBLISHABLE_KEY =
    env("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    env("SUPABASE_PUBLISHABLE_KEY") ||
    env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
    env("SUPABASE_ANON_KEY");

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Missing Supabase URL or publishable key.");
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
    },
    auth: impersonating
      ? {
          storage: typeof window !== "undefined" ? window.sessionStorage : undefined,
          storageKey: "adverx-impersonation-auth",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        }
      : {
          storage: brokeredPreviewStorage(),
          persistSession: true,
          autoRefreshToken: true,
        },
  });
}

let normalClient: ReturnType<typeof createBrowserClient> | undefined;
let impersonationClient: ReturnType<typeof createBrowserClient> | undefined;

function initializeImpersonationTab() {
  if (typeof window === "undefined") return;
  if (
    sessionStorage.getItem(IMPERSONATION_FLAG) !== "1" &&
    new URL(window.location.href).searchParams.has(IMPERSONATION_TOKEN_PARAM)
  ) {
    sessionStorage.setItem(IMPERSONATION_FLAG, "1");
  }
}

// Bootstrap the per-tab flag before any code can request a Supabase client.
// After this synchronous initialization, client selection is controlled only
// by sessionStorage; the URL is never consulted by getSupabase().
initializeImpersonationTab();

export function isImpersonating() {
  return (
    typeof window !== "undefined" &&
    sessionStorage.getItem(IMPERSONATION_FLAG) === "1"
  );
}

export function getSupabase() {

  if (isImpersonating()) {
    impersonationClient ??= createBrowserClient(true);
    return impersonationClient;
  }

  normalClient ??= createBrowserClient(false);
  return normalClient;
}

export async function ensureSupabaseSessionReady() {
  if (typeof window === "undefined") {
    return getSupabase().auth.getSession();
  }

  initializeImpersonationTab();

  if (isImpersonating()) {
    const url = new URL(window.location.href);
    const tokenHash = url.searchParams.get(IMPERSONATION_TOKEN_PARAM);

    if (tokenHash && sessionStorage.getItem(IMPERSONATION_VERIFIED) !== "1") {
      // Remove the credential from browser history before exchanging it.
      url.searchParams.delete(IMPERSONATION_TOKEN_PARAM);
      window.history.replaceState(window.history.state, document.title, url.toString());

      const consumeResponse = await fetch("/api/impersonation/consume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tokenHash }),
      });

      const consumePayload = (await consumeResponse.json().catch(() => null)) as
        | { ok?: boolean; message?: string }
        | null;

      if (!consumeResponse.ok || !consumePayload?.ok) {
        throw new Error(
          consumePayload?.message ?? "Impersonation token is invalid or expired.",
        );
      }

      const { error } = await getSupabase().auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });

      if (error) {
        throw new Error(error.message);
      }

      sessionStorage.setItem(IMPERSONATION_VERIFIED, "1");
    }
  }

  return getSupabase().auth.getSession();
}

// Keep the existing import surface while ensuring all browser auth access goes
// through the single getSupabase() factory above.
export const supabase = new Proxy(
  {} as ReturnType<typeof createBrowserClient>,
  {
    get(_, prop, receiver) {
      return Reflect.get(getSupabase(), prop, receiver);
    },
  },
);
