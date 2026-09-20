import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { ADMIN_ROLES, requireAdminUser, requireAuthenticatedUser } from "@/lib/auth.server";

export const checkRouteAccess = createServerFn({ method: "GET" })
  .validator((data: { admin: boolean }) => data)
  .handler(async ({ data }) => {
    try {
      const user = data.admin ? await requireAdminUser() : await requireAuthenticatedUser();
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role, full_name, username")
        .eq("id", user.id)
        .maybeSingle();

      return {
        authenticated: true,
        admin: ADMIN_ROLES.has(String(profile?.role)),
        userId: user.id,
        fullName: profile?.full_name ?? profile?.username ?? user.email ?? "User",
      };
    } catch {
      return {
        authenticated: false,
        admin: false,
        userId: null,
        fullName: null,
      };
    }
  });

export const startImpersonation = createServerFn({ method: "POST" })
  .validator((data: { userId: string }) => data)
  .handler(async ({ data }) => {
    const admin = await requireAdminUser();

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, username")
      .eq("id", data.userId)
      .maybeSingle();

    if (targetError || !target) throw new Error("Target user not found.");

    const { data: authTarget, error: authTargetError } =
      await supabaseAdmin.auth.admin.getUserById(target.id);

    if (authTargetError || !authTarget.user?.email) {
      throw new Error("Target user does not have an email login.");
    }

    const { data: link, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: authTarget.user.email,
      });

    if (linkError) throw new Error(linkError.message);

    const tokenHash = String((link as any)?.properties?.hashed_token ?? "");
    if (!tokenHash) throw new Error("Unable to create an impersonation token.");

    const tokenBytes = new TextEncoder().encode(tokenHash);
    const digest = await crypto.subtle.digest("SHA-256", tokenBytes);
    const tokenDigest = Array.from(new Uint8Array(digest))
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");

    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    const { error: grantError } = await (supabaseAdmin as any)
      .from("impersonation_grants")
      .insert({
        admin_id: admin.id,
        user_id: target.id,
        token_digest: tokenDigest,
        expires_at: expiresAt,
      });

    if (grantError) throw new Error(grantError.message);

    const { error: auditError } = await (supabaseAdmin as any)
      .from("audit_logs")
      .insert({
        actor_id: admin.id,
        action: "impersonation_started",
        entity_type: "profiles",
        entity_id: target.id,
        metadata: {
          admin_id: admin.id,
          user_id: target.id,
          started_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
      });

    if (auditError) {
      await (supabaseAdmin as any)
        .from("impersonation_grants")
        .delete()
        .eq("token_digest", tokenDigest);
      throw new Error("Unable to record the impersonation audit event.");
    }

    return { tokenHash };
  });
