import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminRoute } from "./admin";
import { ensureSupabaseSessionReady, isImpersonating } from "@/integrations/supabase/client";
import { checkRouteAccess } from "@/lib/auth-guard.functions";

export const Route = createFileRoute("/admin/$section")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    if (isImpersonating()) {
      throw redirect({ to: "/auth", search: { redirect: location.href }, replace: true });
    }
    await ensureSupabaseSessionReady();
    const access = await checkRouteAccess({ data: { admin: true } });
    if (!access.authenticated || !access.admin) {
      throw redirect({ to: "/admin/login", search: { redirect: location.href }, replace: true });
    }
  },
  component: AdminRoute,
});
