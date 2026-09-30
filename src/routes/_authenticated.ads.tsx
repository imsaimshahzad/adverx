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
    markAdLoaded,
  } = usePlatform();
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
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

  const openAd = (ad: Ad) => {
    setSelectedAd(ad);
    setSessionId(null);
  };

  const closeAd = async () => {
    if (completing) return;
    if (sessionId) {
      try {
        await cancelAd(sessionId);
      } catch (error) {
        console.error("[AdverX] failed to close ad session", error);
      }
    }
    setSelectedAd(null);
    setSessionId(null);
  };

  useEffect(() => {
    setCompletedAdIds((current) => {
      const next = new Set(current);
      for (const adId of persistedWatchedIds) next.delete(adId);
      return next;
    });
  }, [state.user?.id, state.adViews.length]);

  useEffect(() => {
    // Warm the provider connection only; request/render the ad when the user opens the visible task.
    // Do not preload or render hidden ad creatives, which may create invalid impressions.
    const scriptUrls = new Set<string>();
    for (const item of ADS) {
      if (item.taskType !== "watch_ad" || !item.adCode) continue;
      const matches = item.adCode.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi);
      for (const match of matches) {
        try {
          scriptUrls.add(new URL(match[1], window.location.href).href);
        } catch {
          // Ignore invalid URLs in an admin-configured ad code.
        }
      }
    }

    const connectedOrigins = new Set<string>();
    for (const scriptUrl of scriptUrls) {
      try {
        const url = new URL(scriptUrl);
        if (!connectedOrigins.has(url.origin)) {
          connectedOrigins.add(url.origin);
          const preconnect = document.createElement("link");
          preconnect.rel = "preconnect";
          preconnect.href = url.origin;
          document.head.appendChild(preconnect);

          const dnsPrefetch = document.createElement("link");
          dnsPrefetch.rel = "dns-prefetch";
          dnsPrefetch.href = url.origin;
          document.head.appendChild(dnsPrefetch);
        }

      } catch {
        // Keep ad tasks usable if a browser rejects a preload hint.
      }
    }
  }, [catalogReady]);

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
                          openAd(ad);
                          try {
                            const id = await startAd(ad.id);
                            setSessionId(id);
                          } catch (error) {
                            setSelectedAd(null);
                            setSessionId(null);
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
        ad={selectedAd}
        sessionId={sessionId}
        onClose={closeAd}
        onAdLoaded={markAdLoaded}
        completing={completing}
        onComplete={async () => {
          if (!sessionId || completing) return;
          setCompleting(true);
          try {
            const reward = await completeAd(sessionId);
            if (selectedAd) {
              setCompletedAdIds((current) => new Set(current).add(selectedAd.id));
            }
            setSelectedAd(null);
            setSessionId(null);
            toast.success(isPrivilegedAccount ? "Test ad completed — no reward credited." : `Reward credited: ${money(reward)}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Reward could not be credited";
            if (message.toLowerCase().includes("already completed today") && selectedAd) {
              setCompletedAdIds((current) => new Set(current).add(selectedAd.id));
              setSelectedAd(null);
              setSessionId(null);
              return;
            }
            toast.error(message);
          } finally {
            setCompleting(false);
          }
        }}
      />    </AppShell>
  );
}

function AdPlayer({
  ad,
  sessionId,
  onClose,
  onAdLoaded,
  completing,
  onComplete,
}: {
  ad: Ad | null;
  sessionId: string | null;
  onClose: () => void | Promise<void>;
  onAdLoaded: (sessionId: string) => Promise<void>;
  completing: boolean;
  onComplete: () => void | Promise<void>;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [adLoaded, setAdLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mediaKey, setMediaKey] = useState(0);
  const [htmlHeight, setHtmlHeight] = useState(180);
  const [iframeScale, setIframeScale] = useState(1);
  const [iframeStage, setIframeStage] = useState({ width: 0, height: 0 });
  const adFrameRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const htmlIframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoLastTimeRef = useRef(0);
  const playingTimeRef = useRef(0);

  const format = ad?.htmlCode ? "html" : ad?.videoUrl ? "video" : ad?.adCode ? "iframe" : "none";
  const htmlMessageId = ad && sessionId ? `ad-${ad.id}-${sessionId}` : "pending";
  const videoDuration = Math.max(1, ad?.watchSeconds ?? 1);
  const remaining = Math.max(0, videoDuration - elapsed);
  const iframeWidth = Math.max(1, ad?.adWidth ?? 300);
  const iframeHeight = Math.max(1, ad?.adHeight ?? 250);

  useEffect(() => {
    if (!ad) return;
    setElapsed(0);
    setAdLoaded(false);
    setLoadError(null);
    setHtmlHeight(180);
    setIframeScale(1);
    setIframeStage({ width: 0, height: 0 });
    videoLastTimeRef.current = 0;
    playingTimeRef.current = 0;
  }, [ad, sessionId]);

  useEffect(() => {
    if (!ad) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [ad]);

  useEffect(() => {
    const video = videoRef.current;
    return () => {
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [mediaKey, ad]);

  useEffect(() => {
    if (!ad || !sessionId || !adLoaded || format === "video") return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.min(videoDuration, Math.floor((Date.now() - started) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [ad, sessionId, adLoaded, format, videoDuration]);

  useEffect(() => {
    if (!ad || format !== "html" || !sessionId) return;
    const iframe = htmlIframeRef.current;
    if (!iframe) return;

    const messageHandler = (event: MessageEvent) => {
      if (event.source !== iframe.contentWindow) return;
      const data = event.data;
      if (!data || data.type !== "adHeight" || data.id !== htmlMessageId) return;
      const height = Number(data.height);
      if (!Number.isFinite(height) || height < 1 || height > 200000) return;
      setHtmlHeight(Math.max(180, Math.ceil(height)));
    };

    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, [ad, format, sessionId, htmlMessageId]);

  useEffect(() => {
    if (!ad || format !== "iframe") return;
    const element = adFrameRef.current;
    if (!element) return;

    let timer: number | null = null;
    const update = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const availableWidth = Math.max(0, element.clientWidth);
        const scale = Math.min(1, availableWidth / iframeWidth);
        setIframeScale(scale);
        setIframeStage({
          width: iframeWidth * scale,
          height: iframeHeight * scale,
        });
      }, 100);
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    const observer = new ResizeObserver(update);
    observer.observe(element);

    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      observer.disconnect();
    };
  }, [ad, format, iframeWidth, iframeHeight]);

  if (!ad) return null;

  const handleLoaded = async () => {
    if (!sessionId || adLoaded || loadError) return;
    try {
      await onAdLoaded(sessionId);
      setAdLoaded(true);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to verify ad load");
    }
  };

  const handleVideoTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    video.playbackRate = 1;
    if (video.paused) return;

    const current = video.currentTime;
    const previous = videoLastTimeRef.current;
    if (current > previous + 0.75) {
      video.currentTime = previous;
      return;
    }

    const delta = Math.max(0, Math.min(0.5, current - previous));
    playingTimeRef.current += delta;
    videoLastTimeRef.current = current;
    setElapsed(Math.min(videoDuration, Math.floor(playingTimeRef.current)));
  };

  const retryVideo = () => {
    setLoadError(null);
    setAdLoaded(false);
    setElapsed(0);
    playingTimeRef.current = 0;
    videoLastTimeRef.current = 0;
    setMediaKey((key) => key + 1);
  };

  const mountAd = ({
    type,
    src,
    w,
    h,
  }: {
    type: "video" | "html" | "iframe";
    src: string;
    w?: number;
    h?: number;
  }) => {
    if (!sessionId) return null;

    if (type === "video") {
      return (
        <div className="aspect-video min-h-[180px] w-full bg-black/10">
          <video
            key={mediaKey}
            ref={videoRef}
            src={src}
            muted
            autoPlay
            playsInline
            preload="auto"
            controls={false}
            onLoadedData={() => void handleLoaded()}
            onCanPlay={() => void handleLoaded()}
            onError={() => {
              setAdLoaded(false);
              setLoadError("Ad failed to load");
            }}
            onTimeUpdate={handleVideoTimeUpdate}
            onSeeking={(event) => {
              const video = event.currentTarget;
              if (video.currentTime > videoLastTimeRef.current + 0.75) {
                video.currentTime = videoLastTimeRef.current;
              }
            }}
            className="block h-full max-h-[70vh] w-full object-contain"
          />
        </div>
      );
    }

    if (type === "html") {
      const srcdoc = `${src}
<script>
(() => {
  const id = ${JSON.stringify(htmlMessageId)};
  let lastHeight = 0;
  const sendHeight = () => {
    const root = document.documentElement;
    const body = document.body;
    const height = Math.max(
      root ? root.scrollHeight : 0,
      root ? root.offsetHeight : 0,
      body ? body.scrollHeight : 0,
      body ? body.offsetHeight : 0
    );
    if (height > 0 && height !== lastHeight) {
      lastHeight = height;
      parent.postMessage({ type: "adHeight", id, height }, "*");
    }
  };
  window.addEventListener("load", sendHeight);
  window.addEventListener("resize", sendHeight);
  if (window.ResizeObserver) {
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.documentElement);
    if (document.body) observer.observe(document.body);
  }
  setTimeout(sendHeight, 50);
  setTimeout(sendHeight, 250);
})();
</script>`;

      return (
        <div className="min-h-[180px] w-full">
          <iframe
            ref={htmlIframeRef}
            title={ad.title}
            srcDoc={srcdoc}
            onLoad={() => void handleLoaded()}
            className="block w-full border-0"
            style={{ height: `${htmlHeight}px` }}
            sandbox="allow-scripts"
            scrolling="no"
          />
        </div>
      );
    }

    return (
      <div
        className="mx-auto flex items-center justify-center"
        style={{
          width: iframeStage.width || Math.min(w ?? 300, 300),
          height: iframeStage.height || Math.min(h ?? 250, 250),
        }}
      >
        <div
          style={{
            width: `${w ?? iframeWidth}px`,
            height: `${h ?? iframeHeight}px`,
            transform: `scale(${iframeScale})`,
            transformOrigin: "top center",
          }}
        >
          <iframe
            title={ad.title}
            srcDoc={src}
            width={w ?? iframeWidth}
            height={h ?? iframeHeight}
            onLoad={() => void handleLoaded()}
            className="block border-0"
            scrolling="no"
            sandbox="allow-scripts"
          />
        </div>
      </div>
    );
  };

  const adSrc = format === "video" ? ad.videoUrl ?? "" : format === "html" ? ad.htmlCode ?? "" : ad.adCode ?? "";

  return (
    <Dialog open onOpenChange={(open) => !open && void onClose()}>
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-modal-title"
        className="w-[92vw] max-w-[920px] max-h-[90vh] gap-3 overflow-hidden p-3 sm:p-4"
      >
        <DialogHeader className="shrink-0 space-y-1 pr-8">
          <DialogTitle id="ad-modal-title">{ad.title}</DialogTitle>
          <DialogDescription>{ad.advertiser}</DialogDescription>
        </DialogHeader>

        <div
          ref={adFrameRef}
          className="relative flex min-h-0 max-h-[calc(90vh-220px)] w-full flex-1 items-center justify-center overflow-hidden rounded-lg bg-muted/20"
        >
          <div className="flex h-full max-h-full min-h-[180px] w-full items-center justify-center overflow-y-auto overscroll-contain">
            {sessionId && (
              <div className="w-full">
                {mountAd({
                  type: format === "video" ? "video" : format === "html" ? "html" : "iframe",
                  src: adSrc,
                  w: iframeWidth,
                  h: iframeHeight,
                })}
              </div>
            )}

            {!sessionId ? (
              <div className="ad-loader absolute inset-0 flex min-h-[180px] items-center justify-center text-sm text-muted-foreground" aria-live="polite">
                Starting secure ad session…
              </div>
            ) : (
              <div
                className="ad-loader pointer-events-none absolute inset-0 flex min-h-[180px] items-center justify-center bg-background/60 text-sm text-muted-foreground backdrop-blur-[1px]"
                hidden={adLoaded || Boolean(loadError)}
                aria-live="polite"
              >
                Loading ad…
              </div>
            )}

            {loadError && (
              <div className="absolute inset-0 flex min-h-[180px] flex-col items-center justify-center gap-3 bg-background/90 p-6 text-center">
                <p className="text-sm font-medium text-destructive">{loadError}</p>
                {format === "video" && (
                  <Button size="sm" onClick={retryVideo}>
                    Retry
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <Progress value={adLoaded ? Math.min(100, (elapsed / videoDuration) * 100) : 0} className="h-1.5 shrink-0" />

        <p className="shrink-0 text-center text-xs leading-4 text-muted-foreground">
          {!sessionId
            ? "Opening secure session…"
            : loadError
              ? "The ad could not be loaded."
              : !adLoaded
                ? "Loading ad… timer starts after the server records the visible ad."
                : remaining > 0
                  ? `Keep the ad open — ${remaining}s remaining`
                  : "Task complete, claim your reward"}
        </p>

        <Button disabled={!adLoaded || remaining > 0 || completing} onClick={() => void onComplete()} className="shrink-0">
          {completing ? "Verifying…" : "Claim reward"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
