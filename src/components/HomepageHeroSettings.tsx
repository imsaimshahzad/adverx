import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export type HomepageHeroConfig = { headline: string; subtext: string; ctaText: string; ctaLink: string; backgroundUrl: string; testimonials: string };
export const defaultHomepageHero: HomepageHeroConfig = { headline: "Complete tasks. Earn rewards. Track everything.", subtext: "A simple rewards workspace where you can complete verified ad tasks, monitor your earnings, manage your network, and request withdrawals.", ctaText: "Start Earning Now", ctaLink: "/auth", backgroundUrl: "", testimonials: JSON.stringify([{ name: "Ayesha Khan", quote: "The dashboard makes every reward easy to understand." }, { name: "Bilal Ahmed", quote: "I can track tasks and withdrawals without confusion." }]) };
const db = supabase as any;
const key = "homepage_hero";

export function useHomepageHero() {
  const [config, setConfig] = useState(defaultHomepageHero);
  useEffect(() => { let active = true; void db.from("admin_settings").select("text_value").eq("key", key).maybeSingle().then(({ data }: any) => { if (!active || !data?.text_value) return; try { setConfig({ ...defaultHomepageHero, ...JSON.parse(data.text_value) }); } catch { /* use defaults */ } }); return () => { active = false; }; }, []);
  return config;
}

export function HomepageHeroSettings() {
  const [form, setForm] = useState(defaultHomepageHero);
  const [saving, setSaving] = useState(false);
  useEffect(() => { void db.from("admin_settings").select("text_value").eq("key", key).maybeSingle().then(({ data }: any) => { if (data?.text_value) try { setForm({ ...defaultHomepageHero, ...JSON.parse(data.text_value) }); } catch { /* use defaults */ } }); }, []);
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
  return <Card><CardHeader><CardTitle>Homepage Hero Settings</CardTitle></CardHeader><CardContent className="grid gap-5"><p className="text-sm text-muted-foreground">Edit the public hero without redeploying. Changes publish instantly after saving.</p>{([['headline','Headline text'],['subtext','Subtext / description'],['ctaText','CTA button text'],['ctaLink','CTA button link'],['backgroundUrl','Hero background / preview image URL (optional)']] as const).map(([field, label]) => <label key={field} className="grid gap-2 text-sm font-medium"><Label>{label}</Label><Input value={form[field]} onChange={(event) => update(field, event.target.value)} /></label>)}<label className="grid gap-2 text-sm font-medium"><Label>Upload hero background / preview image</Label><Input type="file" accept="image/*" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPreview(file); }} /><span className="text-xs text-muted-foreground">PNG, JPG, or WEBP up to 5MB. Stored in public Vercel Blob storage.</span></label><label className="grid gap-2 text-sm font-medium"><Label>Testimonials JSON</Label><textarea className="min-h-24 rounded-md border bg-background px-3 py-2 font-mono text-xs" value={form.testimonials} onChange={(event) => update('testimonials', event.target.value)} aria-describedby="testimonial-help" /><span id="testimonial-help" className="text-xs text-muted-foreground">Add, edit, or remove entries using [{"{\"name\":\"Name\",\"quote\":\"Quote\"}"}].</span></label><div className="grid gap-3 sm:grid-cols-2">{[['wallet','Wallet balance preview'],['rewards',"Today's rewards preview"],['tasks','Available tasks preview'],['plan','Active plan preview']].map(([field, label]) => <label key={field} className="grid gap-2 text-sm font-medium"><Label>{label}</Label><Input defaultValue={field === 'wallet' ? 'PKR 24,850' : field === 'rewards' ? 'PKR 1,250' : field === 'tasks' ? '8 tasks' : 'Lifetime Access'} /></label>)}</div><Button className="w-full sm:w-fit" onClick={() => void save()} disabled={saving}>{saving ? "Publishing…" : "Save & Publish"}</Button></CardContent></Card>;
}

export function HeroTrustStrip() {
  const [metrics, setMetrics] = useState({ users: 0, rewards: 0, withdrawals: 0 });
  useEffect(() => { void Promise.all([db.from("profiles").select("id", { count: "exact", head: true }), db.from("reward_transactions").select("amount_pkr").eq("status", "completed"), db.from("withdrawals").select("id", { count: "exact", head: true }).eq("status", "paid")]).then(([users, rewards, withdrawals]: any[]) => setMetrics({ users: users.count ?? 0, rewards: (rewards.data ?? []).reduce((sum: number, row: any) => sum + Number(row.amount_pkr ?? 0), 0), withdrawals: withdrawals.count ?? 0 })).catch(() => undefined); }, []);
  return <section className="border-y border-border/70 bg-card"><div className="mx-auto grid max-w-7xl gap-4 px-5 py-5 sm:grid-cols-3 lg:px-8"><div><p className="text-2xl font-semibold">{metrics.users.toLocaleString()}+</p><p className="text-xs text-muted-foreground">Members in the workspace</p></div><div><p className="text-2xl font-semibold">Rs. {metrics.rewards.toLocaleString("en-PK")}</p><p className="text-xs text-muted-foreground">Rewards paid out</p></div><div><p className="text-2xl font-semibold">{metrics.withdrawals > 0 ? "24h" : "Fast"}</p><p className="text-xs text-muted-foreground">Average withdrawal time</p></div></div></section>;
}

export default HomepageHeroSettings;
