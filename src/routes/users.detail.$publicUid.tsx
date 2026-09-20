import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

import { UserDetailPage } from "./admin";
import { getUserDetails } from "@/lib/admin-service";
import { supabase } from "@/integrations/supabase/client";
import type { AdminRow } from "@/lib/admin-service";

export const Route = createFileRoute("/users/detail/$publicUid")({
  component: UserDetailRoute,
});

function UserDetailRoute() {
  const { publicUid } = useParams({ from: "/users/detail/$publicUid" });
  const navigate = useNavigate();
  const [data, setData] = useState<AdminRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) {
          navigate({ to: "/admin/login", replace: true });
          return;
        }
        const { data: profile } = await (supabase as any).from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
        if (!profile || !["admin", "super_admin", "moderator"].includes(String(profile.role))) {
          navigate({ to: "/admin/login", replace: true });
          return;
        }
        const result = await getUserDetails(publicUid);
        if (!cancelled) setData(result);
      } catch (cause) {
        if (!cancelled) toast.error(cause instanceof Error ? cause.message : "Unable to load user details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [navigate, publicUid]);

  const loginAsUser = async (userId: string) => {
    const tab = window.open("about:blank", "_blank");
    try {
      if (!tab) throw new Error("Please allow pop-ups for AdverX.");
      const { data: result, error } = await supabase.functions.invoke("admin-impersonate", { body: { user_id: userId } });
      if (error || !result?.action_link) {
        tab.close();
        throw new Error(error?.message || "Unable to start user session.");
      }
      tab.location.href = result.action_link;
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to login as user.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <button className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900" onClick={() => navigate({ to: "/admin" })}>
            <ArrowLeft className="size-4" /> Back to Users
          </button>
          <span className="text-sm font-semibold tracking-wide text-slate-700">AdverX Admin</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
        <UserDetailPage
          data={data}
          loading={loading}
          onBack={() => navigate({ to: "/admin" })}
          onLoginAsUser={loginAsUser}
        />
      </main>
    </div>
  );
}
