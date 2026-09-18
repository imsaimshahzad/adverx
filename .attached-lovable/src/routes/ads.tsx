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
      { title: "Ad tasks — AdNet Rewards" },
      {
        name: "description",
        content:
          "Watch available ad campaigns, complete the required engagement time and get verified rewards credited.",
      },
      { property: "og:title", content: "Ad tasks — AdNet Rewards" },
      {
        property: "og:description",
        content: "Complete verified ad tasks and get rewards credited to your balance.",
      },
    ],
  }),
  component: AdsPage,
});

function AdsPage() {
  const { plan, state, adsCompletedToday, dailyAdLimit, completeAd } = usePlatform();
  const [openAd, setOpenAd] = useState<Ad | null>(null);
  const watchedIds = new Set(
    state.adViews
      .filter((v) => new Date(v.completedAt).toDateString() === new Date().toDateString())
      .map((v) => v.adId),
  );
  const limitReached = adsCompletedToday >= dailyAdLimit;

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
          <div className="surface flex items-center gap-3 p-4">
            <ShieldCheck className="size-5 text-success" />
            <p className="text-xs text-muted-foreground">
              Rewards are credited only after the full engagement time and verification
              checks are passed.
            </p>
          </div>

          <div className="mt-3 space-y-3">
            {ADS.map((ad) => {
              const done = watchedIds.has(ad.id);
              return (
                <div key={ad.id} className="surface p-4">
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
                      onClick={() => setOpenAd(ad)}
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
        onComplete={(id) => {
          const reward = completeAd(id);
          setOpenAd(null);
          toast.success(`Reward credited: ${money(reward)}`);
        }}
      />
    </AppShell>
  );
}

function AdPlayer({
  ad,
  onClose,
  onComplete,
}: {
  ad: Ad | null;
  onClose: () => void;
  onComplete: (adId: string) => void;
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
        <Button disabled={remaining > 0} onClick={() => onComplete(ad.id)}>
          Claim reward
        </Button>
      </DialogContent>
    </Dialog>
  );
}
