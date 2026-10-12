import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type StatConfig = { title: string; source: "members" | "rewards" | "withdrawal_time"; visible: boolean; mode: "auto" | "manual"; manualValue: string };
export type TrustLabelConfig = { id: "verified" | "history" | "secure" | "withdrawals"; title: string; visible: boolean };
export type HomepageHeroConfig = { headline: string; subtext: string; ctaText: string; ctaLink: string; backgroundUrl: string; testimonials: string; stats: { members: StatConfig; rewards: StatConfig; withdrawalTime: StatConfig }; trustLabels: TrustLabelConfig[] };
export const defaultHomepageHero: HomepageHeroConfig = { headline: "Complete tasks. Earn rewards. Track everything.", subtext: "A simple rewards workspace where you can complete verified ad tasks, monitor your earnings, manage your network, and request withdrawals.", ctaText: "Start Earning Now", ctaLink: "/auth", backgroundUrl: "", testimonials: JSON.stringify([{ name: "Ayesha Khan", quote: "The dashboard makes every reward easy to understand." }, { name: "Bilal Ahmed", quote: "I can track tasks and withdrawals without confusion." }]), stats: { members: { title: "Members in the workspace", source: "members", visible: true, mode: "auto", manualValue: "" }, rewards: { title: "Rewards paid out", source: "rewards", visible: true, mode: "auto", manualValue: "" }, withdrawalTime: { title: "Average withdrawal time", source: "withdrawal_time", visible: true, mode: "auto", manualValue: "" } }, trustLabels: [{ id: "verified", title: "Verified Tasks", visible: true }, { id: "history", title: "Transparent History", visible: true }, { id: "secure", title: "Secure Account", visible: true }, { id: "withdrawals", title: "Tracked Withdrawals", visible: true }] };
const db = supabase as any;
// Public homepage hero settings are defensive so incomplete admin values cannot crash the homepage.
const key = "homepage_hero";

export function useHomepageHero() {
  const [config, setConfig] = useState(defaultHomepageHero);
  useEffect(() => { let active = true; void db.from("admin_settings").select("text_value").eq("key", key).maybeSingle().then(({ data }: any) => { if (!active || !data?.text_value) return; try { const saved = JSON.parse(data.text_value);
        setConfig({
          ...defaultHomepageHero,
          ...saved,
          stats: {
            members: { ...defaultHomepageHero.stats.members, ...(saved.stats?.members ?? {}) },
            rewards: { ...defaultHomepageHero.stats.rewards, ...(saved.stats?.rewards ?? {}) },
            withdrawalTime: { ...defaultHomepageHero.stats.withdrawalTime, ...(saved.stats?.withdrawalTime ?? {}) },
          },
          trustLabels: Array.isArray(saved.trustLabels) ? saved.trustLabels : defaultHomepageHero.trustLabels,
        }); } catch { /* use defaults */ } }); return () => { active = false; }; }, []);
  return config;
}

export function HomepageHeroSettings() {
  const [form, setForm] = useState(defaultHomepageHero);
  const [saving, setSaving] = useState(false);
  useEffect(() => { void db.from("admin_settings").select("text_value").eq("key", key).maybeSingle().then(({ data }: any) => { if (data?.text_value) try { const saved = JSON.parse(data.text_value); setForm({ ...defaultHomepageHero, ...saved, stats: { members: { ...defaultHomepageHero.stats.members, ...(saved.stats?.members ?? {}) }, rewards: { ...defaultHomepageHero.stats.rewards, ...(saved.stats?.rewards ?? {}) }, withdrawalTime: { ...defaultHomepageHero.stats.withdrawalTime, ...(saved.stats?.withdrawalTime ?? {}) } }, trustLabels: Array.isArray(saved.trustLabels) ? saved.trustLabels : defaultHomepageHero.trustLabels }); } catch { /* use defaults */ } }); }, []);
  const update = (field: keyof HomepageHeroConfig, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const [uploading, setUploading] = useState(false);
  async function uploadPreview(file: File) {
    setUploading(true);
    const payload = new FormData(); payload.append("file", file);
    const response = await fetch("/api/upload-hero", { method: "POST", body: payload });
    const result = await response.json(); setUploading(false);
    if (!response.ok) { toast.error(result.error ?? "Image upload failed."); return; }
    update("backgroundUrl", result.url); toast.success("Hero image uploaded. Save to publish it.");
  }
  async function save() { setSaving(true); const { error } = await db.from("admin_settings").upsert({ key, label: "Homepage Hero Settings", category: "homepage", description: "Published hero content for the public homepage", text_value: JSON.stringify(form) }, { onConflict: "key" }); setSaving(false); if (error) toast.error(error.message); else toast.success("Homepage hero published."); }
  return <Card><CardHeader><CardTitle>Homepage Hero Settings</CardTitle></CardHeader><CardContent className="grid gap-5"><p className="text-sm text-muted-foreground">Edit the public hero without redeploying. Changes publish instantly after saving.</p>{([['headline','Headline text'],['subtext','Subtext / description'],['ctaText','CTA button text'],['ctaLink','CTA button link'],['backgroundUrl','Hero background / preview image URL (optional)']] as const).map(([field, label]) => <label key={field} className="grid gap-2 text-sm font-medium"><Label>{label}</Label><Input value={form[field]} onChange={(event) => update(field, event.target.value)} /></label>)}<label className="grid gap-2 text-sm font-medium"><Label>Upload hero background / preview image</Label><Input type="file" accept="image/*" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPreview(file); }} /><span className="text-xs text-muted-foreground">PNG, JPG, or WEBP up to 5MB. Stored in public Vercel Blob storage.</span></label><section className="grid gap-3 rounded-xl border p-4"><div><h3 className="font-semibold">Public homepage stats</h3><p className="text-xs text-muted-foreground">Auto uses database totals. Manual lets you set a display value.</p></div>{([{ key: "members", label: "Members in the workspace" }, { key: "rewards", label: "Rewards paid out" }, { key: "withdrawalTime", label: "Average withdrawal time" }] as const).map(({ key: statKey, label }) => <div key={statKey} className="grid gap-2 rounded-lg bg-muted/30 p-3"><label className="grid gap-1 text-sm font-medium"><Label>{label}</Label><Input value={form.stats[statKey].title} onChange={(event) => setForm((current) => ({ ...current, stats: { ...current.stats, [statKey]: { ...current.stats[statKey], title: event.target.value } } }))} /></label><div className="flex flex-wrap items-center gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" checked={form.stats[statKey].visible} onChange={(event) => setForm((current) => ({ ...current, stats: { ...current.stats, [statKey]: { ...current.stats[statKey], visible: event.target.checked } } }))} />Show on website</label><label className="flex items-center gap-2">Value mode <select className="rounded-md border bg-background px-2 py-1" value={form.stats[statKey].mode} onChange={(event) => setForm((current) => ({ ...current, stats: { ...current.stats, [statKey]: { ...current.stats[statKey], mode: event.target.value as "auto" | "manual" } } }))}><option value="auto">Auto</option><option value="manual">Manual</option></select></label></div>{form.stats[statKey].mode === "manual" ? <label className="grid gap-1 text-sm"><Label>Manual display value</Label><Input placeholder={statKey === "members" ? "e.g. 250" : statKey === "rewards" ? "e.g. Rs. 12,500" : "e.g. 24 hours"} value={form.stats[statKey].manualValue} onChange={(event) => setForm((current) => ({ ...current, stats: { ...current.stats, [statKey]: { ...current.stats[statKey], manualValue: event.target.value } } }))} /></label> : null}</div>)}</section><section className="grid gap-3 rounded-xl border p-4"><div><h3 className="font-semibold">Trust labels</h3><p className="text-xs text-muted-foreground">Edit the text and choose which labels appear on the public homepage.</p></div>{form.trustLabels.map((item, index) => <div key={item.id} className="grid gap-2 rounded-lg bg-muted/30 p-3 sm:grid-cols-[1fr_auto] sm:items-center"><label className="grid gap-1 text-sm font-medium"><Label>{item.id === "verified" ? "Verified tasks label" : item.id === "history" ? "History label" : item.id === "secure" ? "Account security label" : "Withdrawals label"}</Label><Input value={item.title} onChange={(event) => setForm((current) => ({ ...current, trustLabels: current.trustLabels.map((entry, i) => i === index ? { ...entry, title: event.target.value } : entry) }))} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={item.visible} onChange={(event) => setForm((current) => ({ ...current, trustLabels: current.trustLabels.map((entry, i) => i === index ? { ...entry, visible: event.target.checked } : entry) }))} />Visible</label></div>)}</section><label className="grid gap-2 text-sm font-medium"><Label>Testimonials JSON</Label><textarea className="min-h-24 rounded-md border bg-background px-3 py-2 font-mono text-xs" value={form.testimonials} onChange={(event) => update('testimonials', event.target.value)} aria-describedby="testimonial-help" /><span id="testimonial-help" className="text-xs text-muted-foreground">Add, edit, or remove entries using [{"{\"name\":\"Name\",\"quote\":\"Quote\"}"}].</span></label><div className="grid gap-3 sm:grid-cols-2">{[['wallet','Wallet balance preview'],['rewards',"Today's rewards preview"],['tasks','Available tasks preview'],['plan','Active plan preview']].map(([field, label]) => <label key={field} className="grid gap-2 text-sm font-medium"><Label>{label}</Label><Input defaultValue={field === 'wallet' ? 'PKR 24,850' : field === 'rewards' ? 'PKR 1,250' : field === 'tasks' ? '8 tasks' : 'Lifetime Access'} /></label>)}</div><Button className="w-full sm:w-fit" onClick={() => void save()} disabled={saving}>{saving ? "Publishing…" : "Save & Publish"}</Button></CardContent></Card>;
}

export function HeroTrustStrip() {
  const config = useHomepageHero();
  const [metrics, setMetrics] = useState({ users: 0, rewards: 0, averageHours: null as number | null });
  useEffect(() => { void Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("wallet_transactions").select("amount").in("type", ["TASK_REWARD", "REFERRAL_REWARD", "REFERRAL_COMMISSION"]).eq("status", "completed"),
    db.from("withdrawals").select("requested_at, reviewed_at").in("status", ["paid", "approved"]),
  ]).then(([users, rewards, withdrawals]: any[]) => {
    const durations = (withdrawals.data ?? []).filter((row: any) => row.requested_at && row.reviewed_at).map((row: any) => (new Date(row.reviewed_at).getTime() - new Date(row.requested_at).getTime()) / 3600000).filter((hours: number) => hours >= 0);
    setMetrics({ users: users.count ?? 0, rewards: (rewards.data ?? []).reduce((sum: number, row: any) => sum + Number(row.amount ?? 0), 0), averageHours: durations.length ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length : null });
  }).catch(() => undefined); }, []);
  const values = {
    members: metrics.users.toLocaleString(),
    rewards: `Rs. ${metrics.rewards.toLocaleString("en-PK")}`,
    withdrawalTime: metrics.averageHours === null ? "No history" : `${metrics.averageHours.toFixed(1)}h`,
  };
  const stats = (Object.keys(config.stats) as Array<keyof HomepageHeroConfig["stats"]>).map((statKey) => {
    const item = config.stats[statKey];
    return item.visible ? { value: item.mode === "manual" && item.manualValue.trim() ? item.manualValue.trim() : values[statKey], title: item.title } : null;
  }).filter(Boolean) as { value: string; title: string }[];
  return <section className="border-y border-border/70 bg-card"><div className="mx-auto grid max-w-7xl gap-4 px-5 py-5 sm:grid-cols-3 lg:px-8">{stats.map((stat) => <div key={stat.title}><p className="text-2xl font-semibold">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.title}</p></div>)}</div></section>;
}

export function HomepageTrustStrip() {
  const config = useHomepageHero();
  const iconById = { verified: "✓", history: "↗", secure: "◆", withdrawals: "▣" } as const;
  return <section className="border-b border-border/70 bg-card/70 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-3 px-5 py-4 text-sm text-muted-foreground lg:px-8">{config.trustLabels.filter((item) => item.visible && item.title.trim()).map((item) => <span key={item.id} className="flex items-center gap-2"><span aria-hidden="true" className="font-semibold text-primary">{iconById[item.id]}</span>{item.title}</span>)}</div></section>;
}

export default HomepageHeroSettings;
