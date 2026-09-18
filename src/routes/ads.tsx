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
  const { plan, state, adsCompletedToday, dailyAdLimit, startAd, completeAd } = usePlatform();
  const [openAd, setOpenAd] = useState<Ad | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const watchedIds = new Set(
    state.adViews
      .filter((v) => new Date(v.completedAt).toDateString() === new Date().toDateString())
      .map((v) => v.adId),
  );
  const availableAds = ADS.filter((ad) => !watchedIds.has(ad.id));
  const limitReached = adsCompletedToday >= dailyAdLimit;
  const remainingAds = Math.max(0, Math.min(dailyAdLimit - adsCompletedToday, availableAds.length));

  return (
    <AppShell
      title="Ad tasks"
      subtitle={plan ? `${adsCompletedToday} of ${dailyAdLimit} completed today` : "Locked"}
    >
      {!plan ? (
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
      ) : (
        <>
          <div className="glass-panel flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-success" />
            <p className="text-xs text-muted-foreground">
              Rewards are credited only after the full engagement time and verification
              checks are passed.
              </p></div>
            <span className="text-sm font-semibold text-foreground">{remainingAds} Ads Remaining Today</span>
          </div>

          <div className="mt-3 space-y-3">
            {availableAds.map((ad) => {
              const done = watchedIds.has(ad.id);
              return (
                <div key={ad.id} className="surface p-4 transition-transform duration-200 hover:-translate-y-0.5 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{ad.title}</p>
                      <p className="text-xs text-muted-foreground">{ad.advertiser}</p>
                    </div>
                    <Badge variant="secondary">{ad.category}</Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{ad.description}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {ad.watchSeconds}s engagement
                    </span>
                    <Button
                      size="sm"
                      variant={done ? "secondary" : "default"}
                      disabled={done || limitReached}
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
                      {done ? "Completed" : limitReached ? "Daily limit" : "Watch"}
                      {!done && !limitReached && <Play className="size-4" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

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
