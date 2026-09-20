import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { money, PLANS, usePlatform } from "@/lib/platform-store";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    meta: [
      { title: "Plans — AdverX" },
      {
        name: "description",
        content:
          "Compare AdverX plans: daily ad limits, network eligibility and minimum withdrawal thresholds.",
      },
      { property: "og:title", content: "Plans — AdverX" },
      {
        property: "og:description",
        content: "Daily ad limits, network eligibility and withdrawal thresholds compared.",
      },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { plan: activePlan, catalogReady, catalogError } = usePlatform();
  const navigate = useNavigate();
  const [selectingId, setSelectingId] = useState<string | null>(null);

  return (
    <AppShell title="Plans" subtitle="Choose the plan that fits your activity">
      <>
      {!catalogReady ? (
        <div className="surface p-6 text-sm text-muted-foreground" role="status">
          {catalogError ? `Unable to load plans. ${catalogError}` : <span className="flex flex-col items-center gap-2"><LoadingIndicator size="md" label="Loading available plans" /><span>Loading available plans</span></span>}
          {catalogError && <Button className="mt-3" variant="outline" onClick={() => window.location.reload()}>Retry</Button>}
        </div>
      ) : PLANS.length === 0 ? (
        <div className="surface p-6 text-sm text-muted-foreground">No active plans are currently available.</div>
      ) : (
      <div className="space-y-3">
        {PLANS.map((p) => {
          const isActive = activePlan?.id === p.id;
          return (
            <div key={p.id} className={`surface relative overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-0.5 ${p.highlight ? "ring-2 ring-primary/30" : ""}`}>
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
                <Line>{p.durationDays ? `${p.durationDays} days validity` : "Lifetime access"}</Line>
                <Line>Minimum withdrawal {money(p.minWithdrawal)}</Line>
                <Line>{p.networkEligible ? "Network rewards enabled" : "No network rewards"}</Line>
              </ul>

              <Button
                className="mt-4 w-full"
                disabled={isActive || selectingId !== null}
                onClick={async () => {
                  if (selectingId || isActive) return;
                  setSelectingId(p.id);
                  try {
                    const { data, error } = await (supabase as any)
                      .from("plans")
                      .select("id, active, status")
                      .eq("id", p.id)
                      .maybeSingle();
                    if (error) throw new Error(`Unable to validate plan: ${error.message}`);
                    if (!data) throw new Error("Plan not found");
                    if (!data.active || data.status !== "active") throw new Error("Plan is inactive");
                    await navigate({ to: "/deposit/$planId", params: { planId: data.id } });
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to open this plan.");
                    setSelectingId(null);
                  }
                }}
              >
                {isActive ? "Current plan" : selectingId === p.id ? <><LoadingIndicator size="sm" label="Opening plan" />Opening…</> : "Select plan"}
              </Button>
            </div>
          );
        })}
      </div>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Earnings depend on available tasks, verified activity and platform capacity. Plan
        payments are not an investment and do not carry a guaranteed return.
      </p>
      </>
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
