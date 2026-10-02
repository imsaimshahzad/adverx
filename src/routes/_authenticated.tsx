import { createFileRoute, redirect } from "@tanstack/react-router";
import { ensureSupabaseSessionReady } from "@/integrations/supabase/client";
import { checkRouteAccess } from "@/lib/auth-guard.functions";

const ADMIN_ONLY_PATHS = ["/users/detail/"];

function requiresAdmin(pathname: string) {
  return ADMIN_ONLY_PATHS.some((path) => pathname.startsWith(path));
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    await ensureSupabaseSessionReady();

    const adminRequired = requiresAdmin(location.pathname);
    const access = await checkRouteAccess({ data: { admin: adminRequired } });

    if (!access.authenticated) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
        replace: true,
      });
    }

    if (adminRequired && !access.admin) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
        replace: true,
      });
    }
  },
});