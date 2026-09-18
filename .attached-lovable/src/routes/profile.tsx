import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogOut, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { money, usePlatform } from "@/lib/platform-store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — AdNet Rewards" },
      {
        name: "description",
        content:
          "Your account details, verification status, active plan and activity level in one place.",
      },
      { property: "og:title", content: "Profile — AdNet Rewards" },
      {
        property: "og:description",
        content: "Account details, verification status, plan and activity level.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { state, plan, logout, activityLevel } = usePlatform();
  const navigate = useNavigate();
  const user = state.user;

  return (
    <AppShell title="Profile" subtitle={user?.username ? `@${user.username}` : undefined}>
      <div className="surface p-4">
        <Row label="Full name" value={user?.fullName ?? "—"} />
        <Row label="Email / phone" value={user?.email ?? "—"} />
        <Row label="Referral code" value={user?.referralCode ?? "—"} />
        <Row label="Member since" value={new Date(user?.createdAt ?? 0).toLocaleDateString()} />
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
          logout();
          navigate({ to: "/auth", replace: true });
        }}
      >
        <LogOut className="size-4" /> Sign out
      </Button>
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
