import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

import { UserDetailPage } from "@/routes/admin";
import { getUserDetails, type AdminRow } from "@/lib/admin-service";
import { startImpersonation } from "@/lib/auth-guard.functions";

export const Route = createFileRoute("/_authenticated/users/detail/$publicUid")({
  component: UserDetailRoute,
});

function UserDetailRoute() {
  const { publicUid } = useParams({ from: "/_authenticated/users/detail/$publicUid" });
  const navigate = useNavigate();
  const [data, setData] = useState<AdminRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessSignals, setAccessSignals] = useState<AdminRow[]>([]);
  const [signalsLoading, setSignalsLoading] = useState(false);
  const [signalsError, setSignalsError] = useState(false);
  const profileId = String((data?.profile as AdminRow | undefined)?.id ?? "");

  useEffect(() => {
    let cancelled = false;
    if (!profileId) return;
    setSignalsLoading(true);
    setSignalsError(false);
    void (async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) throw new Error("Admin session required");
        const response = await fetch(`/api/admin/user-access-signals?userId=${encodeURIComponent(profileId)}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error("Unable to load IP activity");
        const result = await response.json() as { signals?: AdminRow[] };
        if (!cancelled) setAccessSignals(Array.isArray(result.signals) ? result.signals : []);
      } catch {
        if (!cancelled) setSignalsError(true);
      } finally {
        if (!cancelled) setSignalsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profileId]);

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
  }, [navigate, publicUid]);

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
          <button className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900" onClick={() => navigate({ to: "/admin/$", params: { _splat: "users" } })}>
            <ArrowLeft className="size-4" /> Back to Users
          </button>
          <span className="text-sm font-semibold tracking-wide text-slate-700">AdverX Admin</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-6 lg:px-8 lg:py-8">
        <UserDetailPage
          data={data}
          loading={loading}
          onBack={() => navigate({ to: "/admin/$", params: { _splat: "users" } })}
          onLoginAsUser={loginAsUser}
        />
        {!loading && data ? (
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">IP Activity</CardTitle>
              <p className="text-xs text-muted-foreground">Recent sign-in IPs and approximate network location.</p>
            </CardHeader>
            <CardContent>
              {signalsLoading ? <p className="text-sm text-muted-foreground">Loading IP activity…</p> :
                signalsError ? <p className="text-sm text-muted-foreground">IP activity is unavailable right now.</p> :
                accessSignals.length === 0 ? <p className="text-sm text-muted-foreground">No IP activity recorded yet. New sign-ins will appear here when collection is active.</p> :
                <div className="space-y-3">
                  {accessSignals.map((signal, index) => {
                    const ip = String(signal.ip_address ?? "").trim();
                    const location = [signal.city, signal.region, signal.country].filter((value) => typeof value === "string" && value.trim()).join(", ");
                    const lookupUrl = ip ? `https://iplocation.io/ip/${encodeURIComponent(ip)}` : null;
                    return <div key={String(signal.id ?? `${signal.created_at ?? "signal"}-${index}`)} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0">
                        {lookupUrl ? <a href={lookupUrl} target="_blank" rel="noopener noreferrer" className="break-all font-semibold text-primary underline-offset-4 hover:underline">{ip}</a> : <span className="text-sm text-muted-foreground">IP unavailable</span>}
                        <p className="mt-0.5 text-sm text-muted-foreground">{location || "Location unavailable"}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{String(signal.source ?? "sign-in")} · {signal.created_at ? new Date(String(signal.created_at)).toLocaleString() : "Time unavailable"}</p>
                      </div>
                      {lookupUrl ? <a href={lookupUrl} target="_blank" rel="noopener noreferrer" className="inline-flex w-fit shrink-0 items-center text-sm font-medium text-primary hover:underline">View IP location ↗</a> : null}
                    </div>;
                  })}
                  <p className="text-xs text-muted-foreground">IP-based locations are approximate and may identify an ISP or shared network rather than a precise address.</p>
                </div>}
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
