import { createFileRoute } from "@tanstack/react-router";
import { createCsrfMiddleware } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { ADMIN_ROLES } from "@/lib/auth.server";
import {
  clearTrustedDeviceCookie,
  getTrustedDeviceToken,
  isTrustedAdminDevice,
  issueTrustedAdminDevice,
  revokeTrustedAdminDevice,
  sha256Hex,
  trustedDeviceSetCookie,
} from "@/lib/admin-trusted-device.server";
import { enforceIpRateLimit } from "@/lib/api/rate-limit.server";
import { readJsonObject } from "@/lib/api/http.server";

export const Route = createFileRoute("/api/admin/trusted-device")({
  server: {
    middleware: [createCsrfMiddleware()],
    handlers: {
      POST: async ({ request }) => {
        try {
          const limit = await enforceIpRateLimit(request, "admin.trusted-device", 20, 60);
          if (limit) return limit;

          const body = await readJsonObject(request, 4096);
          const action = body?.action;
          if (!body || Object.keys(body).length !== 1 || !["validate", "issue", "revoke"].includes(String(action))) {
            return Response.json({ ok: false }, { status: 400 });
          }

          if (action === "revoke") {
            await revokeTrustedAdminDevice(request);
            return Response.json({ ok: true }, { headers: { "Set-Cookie": clearTrustedDeviceCookie() } });
          }

          const authorization = request.headers.get("authorization");
          if (!authorization?.startsWith("Bearer ")) {
            return Response.json({ ok: false }, { status: 401 });
          }
          const token = authorization.slice(7).trim();
          if (!token) return Response.json({ ok: false }, { status: 401 });

          const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
          if (userError || !userData.user) return Response.json({ ok: false }, { status: 401 });
          const userId = userData.user.id;

          const { data: profile, error: profileError } = await supabaseAdmin
            .from("profiles").select("role").eq("id", userId).maybeSingle();
          if (profileError || !profile || !ADMIN_ROLES.has(String(profile.role))) {
            return Response.json({ ok: false }, { status: 403 });
          }

          if (action === "validate") {
            const trusted = await isTrustedAdminDevice(userId, request);
            return Response.json({ ok: true, trusted });
          }

          const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
          if (claimsError || claimsData?.claims?.aal !== "aal2") {
            return Response.json({ ok: false, message: "Complete authenticator verification before trusting this device." }, { status: 403 });
          }

          const { token: deviceToken, expiresAt } = await issueTrustedAdminDevice(userId);
          return Response.json(
            { ok: true, expiresAt },
            { headers: { "Set-Cookie": trustedDeviceSetCookie(deviceToken) } },
          );
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("[AdverX] trusted-device endpoint failed", error);
          return Response.json({ ok: false, message: "Unable to update trusted device." }, { status: 500 });
        }
      },
    },
  },
});
