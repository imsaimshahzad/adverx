import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Play, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ADS, money, usePlatform, type Ad } from "@/lib/platform-store";

const pakistanDate = (value: number | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date(value));

export const Route = createFileRoute("/ads")({
  head: () => ({
    meta: [
      { title: "Ad tasks — AdverX" },
      {
        name: "description",
        content:
          "Watch available ad campaigns, complete the required engagement time and get verified rewards credited.",
      },
      { property: "og:title", content: "Ad tasks — AdverX" },
      {
        property: "og:description",
        content: "Complete verified ad tasks and get rewards credited to your balance.",
      },
    ],
  }),
  component: AdsPage,
});

function AdsPage() {
  const {
    plan,
    state,
    adsCompletedToday,
    dailyAdLimit,
    todaysEarnings,
    catalogReady,
    catalogError,
    startAd,
    completeAd,
  } = usePlatform();
  const [openAd, setOpenAd] = useState<Ad | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const watchedIds = new Set(
    state.adViews
      .filter((v) => pakistanDate(v.completedAt) === pakistanDate(new Date()))
      .map((v) => v.adId),
  );
  const dailyLimitReached = adsCompletedToday >= dailyAdLimit;
  const earningsLimitReached = Boolean(
    plan?.dailyRewardLimit && todaysEarnings >= plan.dailyRewardLimit,
  );
  const remainingAds = Math.max(0, dailyAdLimit - adsCompletedToday);

  return (
    <AppShell
      title="Ad tasks"
      subtitle={plan ? `${adsCompletedToday} of ${dailyAdLimit} completed today` : "Locked"}
    >
      {!plan && (
        <div className="surface flex flex-col items-center gap-3 p-8 text-center">
          <Lock className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Ad tasks are locked</p>
          <p className="text-xs text-muted-foreground">
            Activate a plan to unlock daily ad tasks.
          </p>
          <Button asChild size="sm">
            <Link to="/plans">View plans</Link>
          </Button>
        </div>
      )}

      <>
        <div className="glass-panel flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-success" />
            <p className="text-xs text-muted-foreground">
              Rewards are credited only after the full engagement time and verification
              checks are passed.
              </p></div>
            <span className="text-sm font-semibold text-foreground">{remainingAds} Ads Remaining Today</span>
          </div>

          {catalogError && (
            <div role="alert" className="mt-3 surface border border-destructive/30 p-4 text-sm text-destructive">
              {catalogError}
            </div>
          )}

          {!catalogReady && !catalogError && (
            <div className="mt-3 surface p-6 text-center text-sm text-muted-foreground">
              Loading active ads…
            </div>
          )}

          {catalogReady && ADS.length === 0 && !catalogError && (
            <div className="mt-3 surface p-6 text-center">
              <p className="text-sm font-medium">No active ads available</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Check back later for new reward-enabled tasks.
              </p>
            </div>
          )}

          <div className="mt-3 space-y-3">
            {ADS.map((ad) => {
              const done = watchedIds.has(ad.id);
              const disabledReason = !plan
                ? "Activate a plan to unlock ad tasks"
                : done
                  ? "Completed today"
                  : dailyLimitReached
                    ? "Daily limit reached"
                    : earningsLimitReached
                      ? "Earnings limit reached"
                      : null;
              const disabled = Boolean(disabledReason);

              return (
                <div
                  key={ad.id}
                  className={`surface p-4 transition-transform duration-200 sm:p-5 ${
                    disabled
                      ? "opacity-60"
                      : "hover:-translate-y-0.5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{ad.title}</p>
                      <p className="text-xs text-muted-foreground">{ad.advertiser}</p>
                    </div>
                    <Badge variant="secondary">{ad.category}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{ad.description}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-muted-foreground">
                      {ad.watchSeconds}s engagement
                    </span>
                    <div className="flex items-center gap-3">
                      {disabledReason && (
                        <span className="text-right text-xs text-muted-foreground">
                          {disabledReason}
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant={disabled ? "secondary" : "default"}
                        disabled={disabled}
                        onClick={async () => {
                          try {
                            const id = await startAd(ad.id);
                            setSessionId(id);
                            setOpenAd(ad);
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Ad could not start");
                          }
                        }}
                      >
                        {done ? "Completed" : disabledReason ?? "Watch"}
                        {!disabled && <Play className="size-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
      </>

      <AdPlayer
        ad={openAd}
        onClose={() => setOpenAd(null)}
        completing={completing}
        onComplete={async () => {
          if (!sessionId || completing) return;
          setCompleting(true);
          try {
            const reward = await completeAd(sessionId);
            setOpenAd(null);
            setSessionId(null);
            toast.success(`Reward credited: ${money(reward)}`);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Reward could not be credited");
          } finally {
            setCompleting(false);
          }
        }}
      />
    </AppShell>
  );
}

function AdPlayer({
  ad,
  onClose,
  completing,
  onComplete,
}: {
  ad: Ad | null;
  onClose: () => void;
  completing: boolean;
  onComplete: () => void | Promise<void>;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!ad) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [ad]);

  if (!ad) return null;
  const remaining = Math.max(0, ad.watchSeconds - elapsed);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ad.title}</DialogTitle>
          <DialogDescription>{ad.advertiser}</DialogDescription>
        </DialogHeader>
        <div className="brand-panel flex h-40 items-center justify-center p-4 text-center text-sm">
          {ad.description}
        </div>
        <Progress value={(elapsed / ad.watchSeconds) * 100} />
        <p className="text-center text-xs text-muted-foreground">
          {remaining > 0
            ? `Keep watching — ${remaining}s remaining`
            : "Engagement complete, claim your reward"}
        </p>
        <Button disabled={remaining > 0 || completing} onClick={() => void onComplete()}>
          {completing ? "Verifying…" : "Claim reward"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
