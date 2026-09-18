import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { money, PLANS, usePlatform } from "@/lib/platform-store";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Plans — AdNet Rewards" },
      {
        name: "description",
        content:
          "Compare AdNet Rewards plans: daily ad limits, network eligibility and minimum withdrawal thresholds.",
      },
      { property: "og:title", content: "Plans — AdNet Rewards" },
      {
        property: "og:description",
        content: "Daily ad limits, network eligibility and withdrawal thresholds compared.",
      },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { plan: activePlan } = usePlatform();

  return (
    <AppShell title="Plans" subtitle="Choose the plan that fits your activity">
      <div className="space-y-3">
        {PLANS.map((p) => {
          const isActive = activePlan?.id === p.id;
          return (
            <div key={p.id} className="surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">{p.name}</h2>
                    {p.highlight && <Badge>Popular</Badge>}
                    {isActive && <Badge variant="secondary">Active</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                </div>
                <p className="num shrink-0 text-lg font-semibold">{money(p.price)}</p>
              </div>

              <ul className="mt-4 space-y-1.5 text-sm">
                <Line>{p.dailyAdLimit} ad tasks per day</Line>
                <Line>{p.durationDays} days validity</Line>
                <Line>Minimum withdrawal {money(p.minWithdrawal)}</Line>
                <Line>{p.networkEligible ? "Network rewards enabled" : "No network rewards"}</Line>
              </ul>

              <Button asChild className="mt-4 w-full" disabled={isActive}>
                <Link to="/deposit/$planId" params={{ planId: p.id }}>
                  {isActive ? "Current plan" : "Select plan"}
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Earnings depend on available tasks, verified activity and platform capacity. Plan
        payments are not an investment and do not carry a guaranteed return.
      </p>
    </AppShell>
  );
}

function Line({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="size-4 text-success" />
      <span>{children}</span>
    </li>
  );
}
