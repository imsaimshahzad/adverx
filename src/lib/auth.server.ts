import { getRequest } from "@tanstack/react-start/server";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ADMIN_ROLES = new Set(["admin", "super_admin", "moderator"]);

export function getRequestBearerToken() {
  const authorization = getRequest().headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) throw new Error("Unauthorized");

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) throw new Error("Unauthorized");
  return token;
}

export async function requireAuthenticatedUser() {
  const token = getRequestBearerToken();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}

export async function requireAdminUser() {
  if (getRequest().headers.get("x-adverx-impersonation") === "1") {
    throw new Error("Admin actions are disabled while impersonating a user.");
  }
  const user = await requireAuthenticatedUser();
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || !ADMIN_ROLES.has(String(profile.role))) {
    throw new Error("Forbidden");
  }

  return user;
}
