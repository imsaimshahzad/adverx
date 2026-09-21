import { createFileRoute, useNavigate, useParams, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { UserDetailPage } from "@/routes/admin";
import { getUserDetails } from "@/lib/admin-service";
import { startImpersonation } from "@/lib/auth-guard.functions";
import { checkRouteAccess } from "@/lib/auth-guard.functions";
import { ensureSupabaseSessionReady, isImpersonating } from "@/integrations/supabase/client";
import type { AdminRow } from "@/lib/admin-service";

export const Route = createFileRoute("/admin/users/detail/$publicUid")({
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
  component: UserDetailRoute,
});

function UserDetailRoute() {
  const { publicUid } = useParams({ from: "/admin/users/detail/$publicUid" });
  const navigate = useNavigate();
  const [data, setData] = useState<AdminRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await getUserDetails(publicUid);
        if (!cancelled) setData(result);
      } catch (cause) {
        if (!cancelled) toast.error(cause instanceof Error ? cause.message : "Unable to load user details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [publicUid]);

  const loginAsUser = async (userId: string) => {
    const tab = window.open("about:blank", "_blank");
    try {
      if (!tab) throw new Error("Please allow pop-ups for AdverX.");
      const result = await startImpersonation({ data: { userId } });
      const url = new URL("/", window.location.origin);
      url.searchParams.set("impersonation_token", result.tokenHash);
      tab.location.href = url.toString();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to login as user.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <button
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            onClick={() => navigate({ to: "/admin/users" })}
          >
            <ArrowLeft className="size-4" /> Back to Users
          </button>
          <span className="text-sm font-semibold tracking-wide text-slate-700">AdverX Admin</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
        <UserDetailPage
          data={data}
          loading={loading}
          onBack={() => navigate({ to: "/admin/users" })}
          onLoginAsUser={loginAsUser}
        />
      </main>
    </div>
  );
}
