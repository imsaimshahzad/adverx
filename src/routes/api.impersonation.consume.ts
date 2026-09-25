import { createFileRoute } from "@tanstack/react-router";
import { createCsrfMiddleware } from "@tanstack/react-start";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function digestToken(token: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );

  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export const Route = createFileRoute("/api/impersonation/consume")({
  server: {
    middleware: [createCsrfMiddleware()],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const keys = body && typeof body === "object" ? Object.keys(body) : [];
          const tokenHash = typeof body?.tokenHash === "string" ? body.tokenHash.trim() : "";
          if (keys.length !== 1 || keys[0] !== "tokenHash") return Response.json({ ok: false }, { status: 400 });

          if (!/^[a-f0-9]{64}$/i.test(tokenHash)) {
            return Response.json({ ok: false }, { status: 400 });
          }

          const tokenDigest = await digestToken(tokenHash);
          const now = new Date().toISOString();

          const { data: grant, error: lookupError } = await (supabaseAdmin as any)
            .from("impersonation_grants")
            .select("id, user_id")
            .eq("token_digest", tokenDigest)
            .is("used_at", null)
            .gt("expires_at", now)
            .maybeSingle();

          if (lookupError || !grant) {
            return Response.json(
              { ok: false, message: "Impersonation token is invalid or expired." },
              { status: 401 },
            );
          }

          const { data: consumed, error: consumeError } = await (supabaseAdmin as any)
            .from("impersonation_grants")
            .update({ used_at: now })
            .eq("id", grant.id)
            .is("used_at", null)
            .gt("expires_at", now)
            .select("id")
            .maybeSingle();

          if (consumeError || !consumed) {
            return Response.json(
              { ok: false, message: "Impersonation token has already been used." },
              { status: 409 },
            );
          }

          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: false }, { status: 400 });
        }
      },
    },
  },
});
