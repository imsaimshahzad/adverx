import { useCallback, useEffect, useState } from "react";
import { Gift, RefreshCw, Save, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Milestone = { plan_key: string; referral_target: number; reward_amount_pkr: number };
type Campaign = { plan_key: string; is_active: boolean; milestones: Milestone[] };
type Payout = { id: string; referrer_name: string; public_uid: string; plan_key: string; referral_target: number; reward_amount_pkr: number; claimed_at: string };
type Overview = { admin_balance: number; total_bonus_paid: number; settings: Campaign[]; recent_payouts: Payout[] };

const LABELS: Record<string,string> = { starter: "Starter", growth: "Growth", pro: "Pro" };
const money = (value: number) => `Rs ${Number(value || 0).toLocaleString("en-PK",{minimumFractionDigits:2,maximumFractionDigits:2})}`;

export function RewardsManager() {
  const [data,setData] = useState<Overview>({admin_balance:0,total_bonus_paid:0,settings:[],recent_payouts:[]});
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState<string|null>(null);
  const [drafts,setDrafts] = useState<Record<string,string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const {data:result,error} = await (supabase as any).rpc("admin_referral_campaign_overview");
    if(error){ toast.error(error.message || "Rewards overview load nahi ho saka."); setLoading(false); return; }
    const next = {
      admin_balance:Number(result?.admin_balance||0),
      total_bonus_paid:Number(result?.total_bonus_paid||0),
      settings:Array.isArray(result?.settings)?result.settings:[],
      recent_payouts:Array.isArray(result?.recent_payouts)?result.recent_payouts:[],
    };
    setData(next);
    const nextDrafts:Record<string,string> = {};
    next.settings.forEach(c=>c.milestones?.forEach(m=>{nextDrafts[`${c.plan_key}-${m.referral_target}`]=String(m.reward_amount_pkr)}));
    setDrafts(nextDrafts);
    setLoading(false);
  },[]);

  useEffect(()=>{void load();},[load]);

  const save = async (campaign:Campaign,milestone:Milestone) => {
    const key=`${campaign.plan_key}-${milestone.referral_target}`;
    const amount=Number(drafts[key]);
    if(!Number.isFinite(amount)||amount<=0||amount>10000){toast.error("Reward amount Rs1 se Rs10,000 ke darmiyan hona chahiye.");return;}
    setSaving(key);
    const {error}=await (supabase as any).rpc("admin_update_referral_campaign_milestone",{
      p_plan_key:campaign.plan_key,p_referral_target:milestone.referral_target,
      p_reward_amount_pkr:amount,p_is_active:campaign.is_active,
    });
    setSaving(null);
    if(error){toast.error(error.message||"Reward update nahi hua.");return;}
    toast.success("Reward milestone update ho gaya.");
    await load();
  };

  const toggle = async (campaign:Campaign) => {
    const first=campaign.milestones?.[0];
    if(!first)return;
    setSaving(campaign.plan_key);
    const {error}=await (supabase as any).rpc("admin_update_referral_campaign_milestone",{
      p_plan_key:campaign.plan_key,p_referral_target:first.referral_target,
      p_reward_amount_pkr:first.reward_amount_pkr,p_is_active:!campaign.is_active,
    });
    setSaving(null);
    if(error){toast.error(error.message||"Campaign status update nahi hua.");return;}
    toast.success(`${LABELS[campaign.plan_key]} campaign ${campaign.is_active?"paused":"activated"}.`);
    await load();
  };

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-xl font-semibold">Rewards Manager</h2><p className="mt-1 text-sm text-muted-foreground">Campaign bonuses Admin ke existing available balance se pay hote hain.</p></div>
      <Button variant="outline" onClick={()=>void load()} disabled={loading}><RefreshCw className={`mr-2 size-4 ${loading?"animate-spin":""}`}/>Refresh</Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Wallet className="size-4"/>Admin available balance</div><p className="num mt-2 text-3xl font-bold">{money(data.admin_balance)}</p><p className="mt-1 text-xs text-muted-foreground">Claim payout se isi balance mein se deduction hogi.</p></div>
      <div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Gift className="size-4"/>Total campaign bonuses paid</div><p className="num mt-2 text-3xl font-bold">{money(data.total_bonus_paid)}</p><p className="mt-1 text-xs text-muted-foreground">All-time successful claims.</p></div>
    </div>
    {loading?<div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">Loading Rewards Manager…</div>:(
      <div className="grid gap-4 xl:grid-cols-3">
        {data.settings.map(campaign=><section key={campaign.plan_key} className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4"><div><h3 className="font-semibold">{LABELS[campaign.plan_key]} campaign</h3><p className="text-xs text-muted-foreground">Plan referrals</p></div><div className="flex items-center gap-2"><Badge variant={campaign.is_active?"secondary":"outline"}>{campaign.is_active?"Active":"Paused"}</Badge><Button size="sm" variant="outline" disabled={saving!==null} onClick={()=>void toggle(campaign)}>{saving===campaign.plan_key?"Saving…":campaign.is_active?"Pause":"Activate"}</Button></div></div>
          <div className="space-y-3 p-4">
            {campaign.milestones.map(m=><div key={m.referral_target} className="rounded-xl border border-border/70 p-3"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-medium">{m.referral_target} direct referrals</span><span className="text-xs text-muted-foreground">PKR</span></div><div className="flex gap-2"><Input inputMode="decimal" value={drafts[`${campaign.plan_key}-${m.referral_target}`]??String(m.reward_amount_pkr)} onChange={e=>setDrafts(prev=>({...prev,[`${campaign.plan_key}-${m.referral_target}`]:e.target.value}))}/><Button size="icon" variant="outline" disabled={saving!==null} onClick={()=>void save(campaign,m)} aria-label="Save reward"><Save className="size-4"/></Button></div></div>)}
          </div>
        </section>)}
      </div>
    )}
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="border-b border-border p-4"><h3 className="font-semibold">Recent bonus payouts</h3><p className="mt-1 text-xs text-muted-foreground">Latest 100 successful campaign claims.</p></div>
      {data.recent_payouts.length===0?<p className="p-5 text-sm text-muted-foreground">Abhi koi campaign payout nahi hua.</p>:<div className="divide-y divide-border">{data.recent_payouts.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="text-sm font-semibold">{p.referrer_name||"User"} · {p.public_uid||"—"}</p><p className="mt-1 text-xs text-muted-foreground">{LABELS[p.plan_key]} · {p.referral_target} referrals · {new Date(p.claimed_at).toLocaleString("en-PK")}</p></div><p className="num text-sm font-bold">-{money(p.reward_amount_pkr)}</p></div>)}</div>}
    </section>
  </div>;
}
