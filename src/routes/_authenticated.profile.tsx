import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Check, Copy, LogOut, Pencil, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { money, usePlatform } from "@/lib/platform-store";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — AdverX" },
      {
        name: "description",
        content:
          "Your account details, verification status, active plan and activity level in one place.",
      },
      { property: "og:title", content: "Profile — AdverX" },
      {
        property: "og:description",
        content: "Account details, verification status, plan and activity level.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const {
    state,
    plan,
    logout,
    updateProfile,
  } = usePlatform();
  const navigate = useNavigate();
  const user = state.user;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ fullName: user?.fullName ?? "", username: user?.username ?? "", email: user?.email ?? "", phone: user?.phone ?? "" });

  async function saveProfile() {
    setSaving(true);
    try {
      await updateProfile(form);
      toast.success("Profile updated.");
      setEditing(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Profile" subtitle={user?.username ? `@${user.username}` : undefined}>
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
        <div className="surface p-4 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-semibold">Plan Status</p>
              <p className="text-xs text-muted-foreground">Your access to daily ad tasks and rewards.</p>
            </div>
            <BadgeCheck className={plan ? "size-5 text-success" : "size-5 text-muted-foreground"} />
          </div>
          {plan ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2"><p className="text-lg font-semibold">{plan.name}</p><span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">Active</span></div>
                <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-muted-foreground sm:grid-cols-3">
                  <span>{money(plan.price)}</span><span>{plan.durationDays ? `${plan.durationDays}-day access` : "Lifetime access"}</span><span>{plan.dailyAdLimit} ads/day</span>
                </div>
              </div>
              <Button asChild size="sm" variant="outline"><Link to="/plans">Manage Plan</Link></Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-semibold">No Active Plan</p><p className="mt-1 text-xs text-muted-foreground">Activate a plan to unlock daily ad tasks and rewards.</p></div>
              <Button asChild size="sm"><Link to="/plans">View Plans</Link></Button>
            </div>
          )}
        </div>

        <div className="surface p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><p className="text-base font-semibold">Personal details</p><p className="text-xs text-muted-foreground">Keep your account information up to date.</p></div>
            <Button size="sm" variant={editing ? "ghost" : "outline"} onClick={() => setEditing((value) => !value)}><Pencil /> {editing ? "Cancel" : "Edit Profile"}</Button>
          </div>
          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-muted-foreground">Full Name<input className="h-10 rounded-md border bg-background px-3 text-sm text-foreground" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
              <label className="grid gap-1 text-xs text-muted-foreground">Username<input disabled className="h-10 rounded-md border bg-muted px-3 text-sm text-muted-foreground" value={form.username} /><span className="text-[11px]">Username cannot be changed.</span></label>
              <label className="grid gap-1 text-xs text-muted-foreground">Email<input type="email" className="h-10 rounded-md border bg-background px-3 text-sm text-foreground" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
              <label className="grid gap-1 text-xs text-muted-foreground">Phone Number<input type="tel" className="h-10 rounded-md border bg-background px-3 text-sm text-foreground" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="03XX XXXXXXX" /></label>
              <div className="flex items-end"><Button className="w-full" disabled={saving} onClick={() => void saveProfile()}>{saving ? "Saving…" : "Save Changes"}</Button></div>
            </div>
          ) : (
            <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              <Row label="Full name" value={user?.fullName ?? "—"} /><Row label="Username" value={user?.username ? `@${user.username}` : "—"} />
              <Row label="Email" value={user?.email ?? "—"} /><Row label="Phone Number" value={user?.phone || "Not added"} />
              <Row label="Referral code" value={user?.referralCode ?? "—"} /><Row label="Member since" value={new Date(user?.createdAt ?? 0).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })} />
              <div className="flex items-center justify-between gap-3 py-1.5"><span className="text-xs text-muted-foreground">Public UID</span><span className="flex items-center gap-2 text-sm font-medium"><span>{user?.publicUid || "—"}</span>{user?.publicUid ? <Button variant="ghost" size="icon" className="size-8" aria-label="Copy Public UID" onClick={() => { void navigator.clipboard.writeText(user.publicUid!); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? <Check /> : <Copy />}</Button> : null}</span></div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
        <div className="surface flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 size-5 text-success" />
          <div>
            <p className="text-sm font-medium">Account security</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your identity details are protected and account activity is recorded securely.
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full text-destructive"
          onClick={() => {
            void logout()
              .then(() => navigate({ to: "/auth", replace: true }))
              .catch((error) => toast.error(error instanceof Error ? error.message : "Unable to sign out."));
          }}
        >
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
