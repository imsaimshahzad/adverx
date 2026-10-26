import { createFileRoute, redirect, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { ensureSupabaseSessionReady, isImpersonating, supabase } from "@/integrations/supabase/client";
import { checkRouteAccess } from "@/lib/auth-guard.functions";

const ADMIN_ONLY_PATHS = ["/users/detail/"];

function requiresAdmin(pathname: string) {
  return ADMIN_ONLY_PATHS.some((path) => pathname.startsWith(path));
}

function AuthenticatedLayout() {
  const location = useLocation();

  useEffect(() => {
    if (isImpersonating()) return;
    let cancelled = false;
    void (async () => {
      try {
        await ensureSupabaseSessionReady();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token || cancelled) return;
        await fetch("/api/access-signal", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
      } catch {
        // Access telemetry must never block the dashboard.
      }
    })();
    return () => { cancelled = true; };
  }, [location.pathname]);

  return <Outlet />;
}

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
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
