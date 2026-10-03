import { formatDate, formatMoney, statusBadge } from "@/lib/display";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Copy, Info, Share2, UserPlus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlatform } from "@/lib/platform-store";
import { referralUrl } from "@/lib/referrals";

export const Route = createFileRoute("/_authenticated/network")({
  head: () => ({
    meta: [
      { title: "My network — AdverX" },
      {
        name: "description",
        content: "Invite friends and track your referral earnings and network.",
      },
    ],
  }),
  component: NetworkPage,
});

function InfoLabel({ children, text }: { children: ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <span
        title={text}
        aria-label={text}
        className="inline-flex size-4 items-center justify-center rounded-full border border-current/30 text-[10px] font-bold text-muted-foreground"
      >
        i
      </span>
    </span>
  );
}

function NetworkPage() {
  const { state, ready, dataError } = usePlatform();
  const [tab, setTab] = useState<"direct" | "indirect">("direct");
  const members = [...state.network].sort((a, b) => Number(b.active) - Number(a.active));
  const code = state.user?.referralCode ?? "—";
  const link = referralUrl(code);
  const notSubscribed = state.unpaidReferrals;
  const currentPaid = tab === "direct" ? state.paidDirectReferrals : state.paidIndirectReferrals;
  const currentUnpaid = tab === "direct" ? state.unpaidDirectReferrals : state.unpaidIndirectReferrals;
  const currentCommission =
    tab === "direct" ? state.directReferralCommission : state.indirectReferralCommission;

  const copy = (value: string, message: string) => {
    void navigator.clipboard.writeText(value);
    toast.success(message);
  };

  return (
    <AppShell
      title="My network"
    >
      <div className="space-y-3">
        {!ready ? (
          <div className="surface flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <LoadingIndicator size="sm" label="Loading your network" /> Loading your network…
          </div>
        ) : dataError ? (
          <div className="surface p-4 text-sm text-destructive">
            Unable to load your network. {dataError}
          </div>
        ) : null}

        {/* Earnings hero */}
        <section className="glass-panel overflow-hidden p-5 sm:p-6">
          <p className="text-sm font-semibold text-muted-foreground">Total earnings</p>
          <p className="num mt-1 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {formatMoney(state.totalReferralCommission, "PKR")}
          </p>
          <p className="mt-2 text-sm font-medium text-foreground/80">
            This month:{" "}
            <span className="num font-semibold">
              +{formatMoney(state.thisMonthReferralCommission, "PKR")}
            </span>
          </p>
        </section>

        {/* Referral code + invite */}
        <section className="glass-panel p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Your referral code</p>
            <span className="text-xs text-muted-foreground">Share it with friends</span>
          </div>
          <div className="mt-3 flex min-h-12 items-center justify-between gap-2 rounded-xl bg-muted px-3">
            <span className="num truncate text-base font-bold tracking-[0.14em]">{code}</span>
            <Button
              variant="ghost"
              className="min-h-10 px-3"
              onClick={() => copy(code, "Referral code copied")}
            >
              <Copy className="size-4" /> Copy
            </Button>
          </div>
          <Button
            className="mt-3 min-h-12 w-full text-base font-semibold"
            onClick={() => copy(link, "Invite link copied")}
          >
            <Share2 className="size-5" /> Invite friends
          </Button>
        </section>

        {/* Three headline stats */}
        <section className="grid grid-cols-3 gap-2.5">
          <div className="surface p-3">
            <p className="text-sm font-medium text-muted-foreground">
              <InfoLabel text="Everyone in your direct and indirect referral network.">Total people</InfoLabel>
            </p>
            <p className="num mt-1 text-2xl font-bold">{state.allTimeNetwork}</p>
          </div>
          <div className="surface p-3">
            <p className="text-sm font-medium text-muted-foreground">
              <InfoLabel text="People in your network who currently have an active plan.">Paid</InfoLabel>
            </p>
            <p className="num mt-1 text-2xl font-bold">{state.paidReferrals}</p>
          </div>
          <div className="surface p-3">
            <p className="text-sm font-medium text-muted-foreground">
              <InfoLabel text="People in your network who do not currently have an active plan.">Unpaid</InfoLabel>
            </p>
            <p className="num mt-1 text-2xl font-bold">{notSubscribed}</p>
          </div>
        </section>

        {/* Reminder */}
        {notSubscribed > 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-3">
            <AlertTriangle className="size-5 shrink-0 text-amber-500" />
            <p className="min-w-0 flex-1 text-sm font-medium leading-5">
              {notSubscribed} people have not paid yet
            </p>
            <Button
              variant="outline"
              className="min-h-11 shrink-0 border-border bg-background/70 px-3 text-sm"
              onClick={() => copy(link, "Invite link copied — share it with them")}
            >
              Remind / Share
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/[0.06] px-3 py-3 text-sm">
            <UserPlus className="size-5 shrink-0 text-primary" />
            <p className="font-medium">Everyone is currently subscribed. Keep sharing your code!</p>
          </div>
        )}

        {/* Direct / indirect tabs */}
        <section className="glass-panel overflow-hidden">
          <div className="grid grid-cols-2 border-b border-border/60">
            {(["direct", "indirect"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`min-h-12 border-b-2 px-3 text-sm font-semibold transition ${
                  tab === value
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {value === "direct"
                  ? `Direct (${state.directNetwork})`
                  : `Indirect (${state.indirectNetwork})`}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2 p-3">
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-sm text-muted-foreground">
                <InfoLabel text="Network members in this tab who have an active plan.">Paid</InfoLabel>
              </p>
              <p className="num mt-1 text-xl font-bold">{currentPaid}</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-sm text-muted-foreground">
                <InfoLabel text="Network members in this tab without an active plan.">Unpaid</InfoLabel>
              </p>
              <p className="num mt-1 text-xl font-bold">{currentUnpaid}</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-sm text-muted-foreground">
                <InfoLabel text="Commission earned from members in this tab.">Commission</InfoLabel>
              </p>
              <p className="num mt-1 text-xl font-bold">{formatMoney(currentCommission, "PKR")}</p>
            </div>
          </div>

          {tab === "direct" ? (
            <div className="divide-y divide-border/60">
              {members.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <UserPlus className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-2 text-sm font-semibold">No new referrals yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Share your code to start building your network.
                  </p>
                </div>
              ) : (
                members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{m.name}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {m.planName} · Joined {formatDate(m.joinedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        className={
                          m.active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : statusBadge(m.status).className
                        }
                      >
                        {m.active ? "Currently earning" : "Not subscribed"}
                      </Badge>
                      <p className="mt-1 text-sm font-medium text-muted-foreground">
                        {formatMoney(m.commission, "PKR")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              {state.indirectNetwork === 0 ? (
                <>
                  <UserPlus className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-2 text-sm font-semibold">No indirect referrals yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Share your code and help your direct referrals invite others.
                  </p>
                </>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Your indirect referrals are shown in the totals above. Commission is tracked automatically as eligible plans are activated.
                </p>
              )}
            </div>
          )}
        </section>

      </div>
    </AppShell>
  );
}
