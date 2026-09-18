import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock, TrendingUp } from "lucide-react";

import { AppShell, StatTile } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { money, usePlatform } from "@/lib/platform-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — AdNet Rewards" },
      {
        name: "description",
        content:
          "Track available earnings, daily ad tasks, network activity and withdrawals in one simple dashboard.",
      },
      { property: "og:title", content: "Dashboard — AdNet Rewards" },
      {
        property: "og:description",
        content: "Available earnings, daily ad tasks, network activity and withdrawals.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const {
    state,
    plan,
    availableBalance,
    todaysEarnings,
    adsCompletedToday,
    dailyAdLimit,
    activityLevel,
    activityScore,
  } = usePlatform();

  const pendingDeposit = state.deposits.find((d) => d.status === "pending");
  const activeMembers = state.network.filter((m) => m.active).length;

  return (
    <AppShell
      title={`Hi, ${state.user?.fullName?.split(" ")[0] ?? "there"}`}
      subtitle={plan ? `${plan.name} plan · Active` : "No active plan"}
    >
      <div className="brand-panel p-5">
        <p className="text-xs uppercase tracking-widest opacity-80">Available earnings</p>
        <p className="num mt-1 text-4xl font-semibold">{money(availableBalance)}</p>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide opacity-75">Today</p>
            <p className="num text-lg font-semibold">{money(todaysEarnings)}</p>
          </div>
          <Button asChild variant="secondary" size="sm">
            <Link to="/withdraw">
              Withdraw <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>

      {!plan && (
        <div className="surface mt-4 p-4">
          {pendingDeposit ? (
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 size-5 text-warning" />
              <div>
                <p className="text-sm font-medium">Deposit under review</p>
                <p className="text-xs text-muted-foreground">
                  Transaction {pendingDeposit.transactionId} is being verified. Your plan
                  activates right after approval.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Activate a plan to start</p>
                <p className="text-xs text-muted-foreground">
                  Plan activation unlocks daily ad tasks, network rewards and withdrawals.
                </p>
              </div>
              <Button asChild size="sm" className="w-full">
                <Link to="/plans">View plans</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile
          label="Ads"
          value={`${adsCompletedToday} / ${dailyAdLimit || "—"}`}
          hint="Completed today"
        />
        <StatTile
          label="Network"
          value={`${activeMembers}`}
          hint={`${state.network.length} total members`}
        />
      </div>

      <div className="surface mt-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <p className="text-sm font-medium">Activity level</p>
          </div>
          <Badge variant="secondary">{activityLevel}</Badge>
        </div>
        <Progress value={activityScore} className="mt-3" />
        <p className="mt-2 text-xs text-muted-foreground">
          Keep completing daily tasks and growing an active network to improve your level.
        </p>
      </div>

      {plan && (
        <div className="surface mt-3 p-4">
          <p className="text-sm font-medium">Today&apos;s tasks</p>
          <div className="mt-3 space-y-2">
            {Array.from({ length: dailyAdLimit }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2
                  className={
                    i < adsCompletedToday
                      ? "size-4 text-success"
                      : "size-4 text-muted-foreground/40"
                  }
                />
                <span
                  className={
                    i < adsCompletedToday ? "text-muted-foreground line-through" : ""
                  }
                >
                  Ad task {i + 1}
                </span>
              </div>
            ))}
          </div>
          <Button asChild size="sm" variant="outline" className="mt-3 w-full">
            <Link to="/ads">Go to ads</Link>
          </Button>
        </div>
      )}
    </AppShell>
  );
}
