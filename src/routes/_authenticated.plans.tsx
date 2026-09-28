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
    links: [{ rel: "canonical", href: "https://adverx.online/plans" }],
    meta: [
      { title: "AdverX Plans — Choose Your Reward Plan" },
      {
        name: "description",
        content:
          "Explore AdverX plans, daily ad task limits, referral rewards and withdrawal eligibility."
      },
      { property: "og:title", content: "AdverX Plans — Choose Your Reward Plan" },
      {
        property: "og:description",
        content: "Explore AdverX plans, daily ad task limits, referral rewards and withdrawal eligibility.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://adverx.online/" },
            { "@type": "ListItem", position: 2, name: "Plans", item: "https://adverx.online/plans" },
          ],
        }),
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
      <div className="space-y-6">
        {!catalogReady ? (
          <div className="surface p-6 text-sm text-muted-foreground" role="status">
            {catalogError ? (
              `Unable to load plans. ${catalogError}`
            ) : (
              <span className="flex flex-col items-center gap-2">
                <LoadingIndicator size="md" label="Loading available plans" />
                <span>Loading available plans</span>
              </span>
            )}
            {catalogError && (
              <Button className="mt-3" variant="outline" onClick={() => window.location.reload()}>
                Retry
              </Button>
            )}
          </div>
        ) : PLANS.length === 0 ? (
          <div className="surface p-6 text-sm text-muted-foreground">
            No active plans are currently available.
          </div>
        ) : (
          <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
            {PLANS.map((p) => {
              const isActive = activePlan?.id === p.id;
              const isSelecting = selectingId === p.id;

              return (
                <div
                  key={p.id}
                  className={[
                    "relative flex h-full flex-col overflow-hidden rounded-xl border bg-background p-6 shadow-sm transition-all duration-200",
                    "hover:-translate-y-1 hover:shadow-lg",
                    p.highlight
                      ? "border-primary/50 ring-2 ring-primary/15"
                      : "border-border",
                  ].join(" ")}
                >
                  {p.highlight && (
                    <div className="absolute right-4 top-4">
                      <Badge>Popular</Badge>
                    </div>
                  )}

                  <div className="mb-5">
                    <div className="flex items-center gap-2 pr-20">
                      <h2 className="text-xl font-medium text-muted-foreground">{p.name}</h2>
                      {isActive && <Badge variant="secondary">Active</Badge>}
                    </div>

                    <div className="mt-3 flex items-baseline text-foreground">
                      <span className="text-2xl font-semibold">Rs.</span>
                      <span className="num text-5xl font-extrabold tracking-tight">
                        {money(p.price).replace(/^Rs\\.\\s?/, "")}
                      </span>
                      <span className="ml-2 text-lg font-normal text-muted-foreground">
                        one-time
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                  </div>

                  <ul className="my-5 flex-1 space-y-4">
                    <Line>{p.dailyAdLimit} ad tasks per day</Line>
                    <Line>{p.durationDays ? `${p.durationDays} days validity` : "Lifetime access"}</Line>
                    <Line>Direct referral: {p.referrerCommissionPct}%</Line>
                    <Line>
                      {p.indirectReferralPct > 0
                        ? `Indirect referral: ${p.indirectReferralPct}% · Up to Level 6 earnings`
                        : "Indirect referral not included"}
                    </Line>
                    <Line>Minimum withdrawal {money(p.minWithdrawal)}</Line>
                    {p.networkEligible ? (
                      <Line>Network rewards enabled</Line>
                    ) : (
                      <Line muted>No network rewards</Line>
                    )}
                  </ul>

                  <Button
                    className="mt-2 w-full rounded-lg"
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
                        if (!data.active || data.status !== "active") {
                          throw new Error("Plan is inactive");
                        }
                        await navigate({ to: "/deposit/$planId", params: { planId: data.id } });
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Unable to open this plan.",
                        );
                        setSelectingId(null);
                      }
                    }}
                  >
                    {isActive ? (
                      "Current plan"
                    ) : isSelecting ? (
                      <>
                        <LoadingIndicator size="sm" label="Opening plan" />
                        Opening…
                      </>
                    ) : (
                      "Choose plan"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <p className="mx-auto max-w-3xl text-center text-xs text-muted-foreground">
          Earnings depend on available tasks, verified activity and platform capacity. Plan
          payments are not an investment and do not carry a guaranteed return.
        </p>
      </div>
    </AppShell>
  );
}

function Line({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <li
      className={`flex items-start gap-3 ${muted ? "line-through decoration-muted-foreground/60" : ""}`}
    >
      <Check
        className={`mt-0.5 size-5 shrink-0 ${muted ? "text-muted-foreground" : "text-primary"}`}
      />
      <span
        className={`text-base font-normal leading-tight ${muted ? "text-muted-foreground" : "text-foreground/80"}`}
      >
        {children}
      </span>
    </li>
  );
}
