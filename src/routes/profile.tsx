import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Copy, LogOut, Pencil, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { money, usePlatform } from "@/lib/platform-store";

export const Route = createFileRoute("/profile")({
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
    activityLevel,
    updateProfile,
    availableBalance,
    totalWithdrawn,
    todaysEarnings,
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
      <div className="mx-auto w-full max-w-2xl">
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

      <div className="mx-auto grid w-full max-w-2xl gap-3">
        <div className="grid gap-3 sm:grid-cols-3" aria-label="Personal wallet summary">
          <Metric label="Available balance" value={money(availableBalance)} />
          <Metric label="Total withdrawn" value={money(totalWithdrawn)} />
          <Metric label="Today&apos;s earnings" value={money(todaysEarnings)} />
        </div>

      <div className="surface mt-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Account status</p>
          <Badge variant={user?.status === "active" ? "default" : "secondary"}>
            {user?.status === "active" ? "Active" : "Pending verification"}
          </Badge>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-medium">Activity level</p>
          <Badge variant="secondary">{activityLevel}</Badge>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-sm font-medium">Plan</p>
          <span className="text-sm text-muted-foreground">
            {plan ? `${plan.name} · ${money(plan.price)}` : "None"}
          </span>
        </div>
        <Button asChild variant="outline" size="sm" className="mt-4 w-full">
          <Link to="/plans">{plan ? "Change plan" : "Activate a plan"}</Link>
        </Button>
        {user?.role && ["admin", "super_admin", "moderator"].includes(user.role) ? (
          <Button asChild variant="secondary" size="sm" className="mt-2 w-full">
            <Link to="/admin">Open Admin Panel</Link>
          </Button>
        ) : null}
      </div>

      <div className="surface mt-3 flex items-start gap-3 p-4">
        <ShieldCheck className="mt-0.5 size-5 text-success" />
        <p className="text-xs text-muted-foreground">
          Balances are computed from a verified transaction ledger. They can never be edited
          from the app and every credit or debit is recorded.
        </p>
      </div>

      <Button
        variant="ghost"
        className="mt-3 w-full text-destructive"
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
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
