import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, Play, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

export const Route = createFileRoute("/_authenticated/ads")({
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
    catalogReady,
    catalogError,
    startAd,
    completeAd,
    cancelAd,
  } = usePlatform();
  const [openAd, setOpenAd] = useState<Ad | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [startingAdId, setStartingAdId] = useState<string | null>(null);
  const [completedAdIds, setCompletedAdIds] = useState<Set<string>>(new Set());

  const persistedWatchedIds = new Set(
    state.adViews
      .filter((v) => pakistanDate(v.completedAt) === pakistanDate(new Date()))
      .map((v) => v.adId),
  );
  const watchedIds = new Set([...persistedWatchedIds, ...completedAdIds]);

  useEffect(() => {
    setCompletedAdIds((current) => {
      const next = new Set(current);
      for (const adId of persistedWatchedIds) next.delete(adId);
      return next;
    });
  }, [state.user?.id, state.adViews.length]);

  const isPrivilegedAccount = ["admin", "super_admin", "moderator"].includes(
    String(state.user?.role ?? "").toLowerCase(),
  );
  const dailyLimitReached = adsCompletedToday >= dailyAdLimit;
  const remainingAds = Math.max(0, dailyAdLimit - adsCompletedToday);

  return (
    <AppShell
      title="Ad tasks"
      subtitle={isPrivilegedAccount ? "Admin account" : plan ? `${adsCompletedToday} of ${dailyAdLimit} completed today` : "Locked"}
    >
      {isPrivilegedAccount && (
        <div className="surface mb-3 flex flex-col items-center gap-2 p-4 text-center">
          <ShieldCheck className="size-5 text-muted-foreground" />
          <p className="text-sm font-semibold">Testing mode — rewards disabled</p>
          <p className="max-w-md text-xs text-muted-foreground">
            You can watch ads to test playback and completion. Admin, super admin, and moderator accounts receive Rs. 0.
          </p>
        </div>
      )}
      <>
      {!plan && (
        <div className="surface flex flex-col items-center gap-3 p-8 text-center">
          <Lock className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Ad Tasks Locked</p>
          <p className="text-xs text-muted-foreground">
            Activate a plan to unlock daily ad tasks and start earning rewards.
          </p>
          <Button asChild size="sm">
            <Link to="/plans">View Plans</Link>
          </Button>
        </div>
      )}

      {plan ? (
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
                    : null;
              const disabled = Boolean(disabledReason);

              return (
                <div
                  key={ad.id}
                  className={`surface p-4 transition-transform duration-200 sm:p-5 ${disabled ? "opacity-60" : "hover:-translate-y-0.5"}`}
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
                        disabled={disabled || startingAdId !== null}
                        onClick={async () => {
                          if (startingAdId) return;
                          setStartingAdId(ad.id);
                          try {
                            const id = await startAd(ad.id);
                            setSessionId(id);
                            setOpenAd(ad);
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Ad could not start");
                          } finally {
                            setStartingAdId(null);
                          }
                        }}
                      >
                        {startingAdId === ad.id
                          ? "Starting…"
                          : done
                            ? "✓ Ad Watched"
                            : disabledReason ?? (ad.taskType === "watch_ad" ? "Watch Ad" : "Start Task")}
                        {!disabled && <Play className="size-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      </>
      <AdPlayer
        ad={openAd}
        onClose={async () => {
          if (sessionId && !completing) {
            try {
              await cancelAd(sessionId);
            } catch (error) {
              console.error("[AdverX] failed to close ad session", error);
            }
          }
          setOpenAd(null);
          setSessionId(null);
        }}
        completing={completing}
        onComplete={async () => {
          if (!sessionId || completing) return;
          setCompleting(true);
          try {
            const reward = await completeAd(sessionId);
            if (openAd) {
              setCompletedAdIds((current) => new Set(current).add(openAd.id));
            }
            setOpenAd(null);
            setSessionId(null);
            toast.success(isPrivilegedAccount ? "Test ad completed — no reward credited." : `Reward credited: ${money(reward)}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Reward could not be credited";
            if (message.toLowerCase().includes("already completed today") && openAd) {
              setCompletedAdIds((current) => new Set(current).add(openAd.id));
              setOpenAd(null);
              setSessionId(null);
              return;
            }
            toast.error(message);
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
  const [adScale, setAdScale] = useState(1);
  const adFrameRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ad) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [ad]);

  useEffect(() => {
    if (!ad || !ad.adWidth || !ad.adHeight || !adFrameRef.current) {
      setAdScale(1);
      return;
    }
    const element = adFrameRef.current;
    const updateScale = () => setAdScale(Math.min(1, element.clientWidth / ad.adWidth!));
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ad]);

  if (!ad) return null;
  const remaining = Math.max(0, ad.watchSeconds - elapsed);
  const frameWidth = ad.adWidth;
  const frameHeight = ad.adHeight;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ad.title}</DialogTitle>
          <DialogDescription>{ad.advertiser}</DialogDescription>
        </DialogHeader>
        {ad.taskType === "watch_ad" && ad.adCode && frameWidth && frameHeight ? (
          <div
            ref={adFrameRef}
            className="w-full overflow-hidden rounded-xl bg-muted/20"
            style={{ height: `${frameHeight}px` }}
          >
            <div
              className="mx-auto origin-top"
              style={{
                width: `${frameWidth}px`,
                height: `${frameHeight}px`,
                transform: `scale(${adScale} )`,
                transformOrigin: "top center",
              }}
            >
              <iframe
                title={ad.title}
                srcDoc={ad.adCode}
                width={frameWidth}
                height={frameHeight}
                className="block border-0"
                scrolling="no"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
              />
            </div>
          </div>        ) : (
          <div className="brand-panel flex min-h-40 items-center justify-center p-4 text-center text-sm">
            <div>
              <p>{ad.description}</p>
              {ad.destinationUrl ? <a href={ad.destinationUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-medium text-primary underline underline-offset-4">Open task</a> : null}
            </div>
          </div>
        )}
        <Progress value={(elapsed / ad.watchSeconds) * 100} />
        <p className="text-center text-xs text-muted-foreground">
          {remaining > 0
            ? `Keep the task open — ${remaining}s remaining`
            : "Task complete, claim your reward"}
        </p>
        <Button disabled={remaining > 0 || completing} onClick={() => void onComplete()}>
          {completing ? "Verifying…" : "Claim reward"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
