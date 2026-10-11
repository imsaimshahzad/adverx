import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

import {
  ADMIN_ROLES,
  requireAdminUser,
  requireAuthenticatedUser,
} from "@/lib/auth.server";

export const checkRouteAccess = createServerFn({ method: "GET" })
  .validator((data: { admin: boolean }) => data)
  .handler(async ({ data }) => {
    try {
      const user = data.admin
        ? await requireAdminUser()
        : await requireAuthenticatedUser();
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("role, full_name, username")
        .eq("id", user.id)
        .maybeSingle();

      return {
        authenticated: true,
        admin: ADMIN_ROLES.has(String(profile?.role)),
        userId: user.id,
        fullName:
          profile?.full_name ?? profile?.username ?? user.email ?? "User",
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

    if (targetError || !target) throw new Error("Target user not found."¶»§q«^