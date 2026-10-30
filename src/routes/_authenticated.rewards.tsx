import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, CheckCircle2, Gift, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney, formatDate } from "@/lib/display";

type Milestone = {
  target: number;
  reward_amount_pkr: number;
  claimed: boolean;
  claimable: boolean;
};
type Campaign = {
  plan_key: "starter" | "growth" | "pro";
  is_active: boolean;
  progress: number;
  cycle_started_at: string;
  milestones: Milestone[];
};
type HistoryItem = {
  id: string;
  plan_key: string;
  referral_target: number;
  reward_amount_pkr: number;
  claimed_at: string;
};
type RewardsData = { campaigns: Campaign[]; history: HistoryItem[] };

const CAMPAIGNS = [
  { key: "starter", label: "Starter", description: "Starter plan referrals", row: "border-l-4 border-l-rose-500 border-y border-r border-rose-500/35 bg-rose-500/[0.055] shadow-[0_0_18px_rgba(244,63,94,0.07)] hover:bg-rose-500/[0.09] hover:shadow-[0_0_22px_rgba(244,63,94,0.12)]", icon: "bg-rose-500/15 text-rose-600 dark:text-rose-300", badge: "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300", progress: "bg-rose-500" },
  { key: "growth", label: "Growth", description: "Growth plan referrals", row: "border-l-4 border-l-emerald-500 border-y border-r border-emerald-500/35 bg-emerald-500/[0.055] shadow-[0_0_18px_rgba(16,185,129,0.07)] hover:bg-emerald-500/[0.09] hover:shadow-[0_0_22px_rgba(16,185,129,0.12)]", icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300", badge: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", progress: "bg-emerald-500" },
  { key: "pro", label: "Pro", description: "Pro plan referrals", row: "border-l-4 border-l-blue-500 border-y border-r border-blue-500/35 bg-blue-500/[0.055] shadow-[0_0_18px_rgba(59,130,246,0.07)] hover:bg-blue-500/[0.09] hover:shadow-[0_0_22px_rgba(59,130,246,0.12)]", icon: "bg-blue-500/15 text-blue-600 dark:text-blue-300", badge: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300", progress: "bg-blue-500" },
] as const;

export const Route = createFileRoute("/_authenticated/rewards")({
  head: () => ({
    meta: [
      { title: "Rewards — AdverX" },
      { name: "description", content: "Complete direct referral milestones and claim AdverX campaign bonuses." },
    ],
  }),
  component: RewardsPage,
});

function RewardsPage() {
  const [data, setData] = useState<RewardsData>({ campaigns: [], history: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: result, error: rpcError } = await (supabase as any).rpc("get_referral_campaign_rewards");
    if (rpcError) {
      setError(rpcError.message || "Rewards could not be loaded.");
      setLoading(false);
      return;
    }
    setData({
      campaigns: Array.isArray(result?.campaigns) ? result.campaigns : [],
      history: Array.isArray(result?.history) ? result.history : [],
    });
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const campaignCards = useMemo(
    () => data.campaigns.flatMap((campaign) => campaign.milestones.map((milestone) => ({
      campaign,
      milestone,
      plan: CAMPAIGNS.find((item) => item.key === campaign.plan_key),
    }))),
    [data.campaigns],
  );
  const totalClaimed = data.history.reduce((sum, item) => sum + Number(item.reward_amount_pkr || 0), 0);

  const claim = async (planKey: Campaign["plan_key"], target: number) => {
    const claimKey = `${planKey}-${target}`;
    if (claiming !== null) return;
    setClaiming(claimKey);
    const { data: result, error: claimError } = await (supabase as any).rpc("claim_referral_campaign_reward", {
      p_plan_key: planKey,
      p_referral_target: target,
    });
    setClaiming(null);
    if (claimError) {
      toast.error(claimError.message || "Bonus claim failed.");
      return;
    }
    toast.success(`Rs ${Number(result?.reward_amount_pkr ?? 0).toLocaleString("en-PK")} bonus added to your balance.`);
    await load();
  };

  return (
    <AppShell title="Rewards" subtitle="Earn extra bonuses through direct referral milestones">
      <div className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="glass-panel flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Gift className="size-6" /></div>
            <div><p className="text-sm text-muted-foreground">Total campaign bonuses</p><p className="num mt-1 text-2xl font-bold">{formatMoney(totalClaimed, "PKR")}</p></div>
          </div>
          <div className="glass-panel flex items-center gap-4 p-5">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Award className="size-6" /></div>
            <div><p className="text-sm text-muted-foreground">Milestones claimed</p><p className="num mt-1 text-2xl font-bold">{data.history.length}</p></div>
          </div>
        </section>

        <section className="glass-panel overflow-hidden">
          <div className="border-b border-border/60 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><h2 className="text-lg font-semibold">Referral campaigns</h2><p className="mt-1 text-sm text-muted-foreground">Har campaign mein direct referrals ke milestones complete karein.</p></div>
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Starter, Growth aur Pro plans ke tamam milestones aik hi list mein hain.</p>
          </div>

          {loading ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-sm text-muted-foreground"><LoadingIndicator size="md" label="Loading rewards" />Loading campaign rewards…</div>
          ) : error ? (
            <div className="p-6 text-center"><p className="text-sm text-destructive">{error}</p><Button className="mt-3" variant="outline" onClick={() => void load()}>Try again</Button></div>
          ) : campaignCards.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">Campaign data is not available yet.</div>
          ) : (
            <div className="space-y-5 p-4 sm:p-6">
              <div className="space-y-2">
                {campaignCards.map(({ campaign, milestone, plan }) => {
                  const percent = Math.min(100, Math.round((campaign.progress / milestone.target) * 100));
                  const claimKey = `${campaign.plan_key}-${milestone.target}`;
                  return (
                    <article key={claimKey} className={`rounded-xl border px-3 py-3 transition sm:px-4 ${plan?.row ?? "border-border/80 bg-card hover:border-primary/40"}`}>
                      <div className="flex items-center gap-3">
                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${plan?.icon ?? "bg-primary/10 text-primary"}`}>{milestone.claimed ? <CheckCircle2 className="size-5" /> : <Gift className="size-5" />}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold">{milestone.target} direct referrals</p><Badge variant="outline" className={`px-2 py-0 text-[10px] ${plan?.badge ?? ""}`}>{plan?.label ?? campaign.plan_key} task</Badge></div>
                          <p className="mt-0.5 text-xs text-muted-foreground">One-time campaign bonus · Progress {Math.min(campaign.progress, milestone.target)} / {milestone.target}</p>
                          <div className="mt-2 h-1.5 max-w-64 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all ${plan?.progress ?? "bg-primary"}`} style={{ width: `${percent}%` }} /></div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5"><p className={`num text-sm font-bold sm:text-base ${plan?.icon?.split(" ").pop() ?? "text-foreground"}`}>{formatMoney(milestone.reward_amount_pkr, "PKR")}</p>
                          {milestone.claimed ? <Badge className="border-emerald-500/20 bg-emerald-500/10 px-2 py-0 text-emerald-700">Claimed</Badge> : milestone.claimable ? <Button size="sm" className="h-8 px-3" disabled={claiming !== null || !campaign.is_active} onClick={() => void claim(campaign.plan_key, milestone.target)}>{claiming === claimKey ? "Claiming…" : "Claim"}</Button> : <Badge variant="outline" className="px-2 py-0 text-[10px]">{campaign.is_active ? "Keep going" : "Paused"}</Badge>}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground">How it works</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Only direct referrals with an active plan count.</li>
                  <li>Each referral is counted under their latest active plan.</li>
                  <li>Claiming any milestone resets progress for this plan campaign only.</li>
                  <li>Progress resets monthly; claimed bonuses stay in your balance and history.</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        <section className="glass-panel overflow-hidden">
          <div className="border-b border-border/60 p-5"><h2 className="text-lg font-semibold">Bonus history</h2><p className="mt-1 text-sm text-muted-foreground">Your previously claimed campaign rewards.</p></div>
          {data.history.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No campaign bonuses claimed yet.</p> : (
            <div className="divide-y divide-border/60">
              {data.history.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="text-sm font-semibold">{item.plan_key.charAt(0).toUpperCase()+item.plan_key.slice(1)} · {item.referral_target} referrals</p><p className="mt-1 text-xs text-muted-foreground">{formatDate(item.claimed_at)}</p></div><p className="num text-sm font-bold text-primary">+{formatMoney(item.reward_amount_pkr, "PKR")}</p></div>)}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
