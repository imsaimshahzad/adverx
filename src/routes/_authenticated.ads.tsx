import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Globe, ListChecks, Lock, MessageCircle, Play, ShieldCheck, Youtube } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
    refreshLiveData,
    catalogRevision,
  } = usePlatform();
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [startingAdId, setStartingAdId] = useState<string | null>(null);
  const openRequestRef = useRef(0);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const previousCardRectsRef = useRef(new Map<string, DOMRect>());
  const [completedAdIds, setCompletedAdIds] = useState<Set<string>>(new Set());
  const [displayAdIds, setDisplayAdIds] = useState<string[]>([]);
  const persistedWatchedIds = new Set(
    state.adViews
      .filter((v) => pakistanDate(v.completedAt) === pakistanDate(new Date()))
      .map((v) => v.adId),
  );
  const watchedIds = new Set([...persistedWatchedIds, ...completedAdIds]);

  const openAd = (ad: Ad) => {
    openRequestRef.current += 1;
    setSelectedAd(ad);
    setSessionId(null);
  };

  const closeAd = async () => {
    if (completing) return;
    openRequestRef.current += 1;
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
    if (!catalogReady || selectedAd) return;
    const serverIds = ADS.map((ad) => ad.id);
    const completed = new Set([...persistedWatchedIds, ...completedAdIds]);
    setDisplayAdIds([
      ...serverIds.filter((id) => !completed.has(id)),
      ...serverIds.filter((id) => completed.has(id)),
    ]);
  }, [catalogReady, catalogRevision, selectedAd, state.adViews.length, state.user?.id, completedAdIds]);

  useLayoutEffect(() => {
    if (!displayAdIds.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nextRects = new Map<string, DOMRect>();
    displayAdIds.forEach((id) => {
      const node = cardRefs.current.get(id);
      if (node) nextRects.set(id, node.getBoundingClientRect());
    });
    if (!reduced) {
      nextRects.forEach((nextRect, id) => {
        const node = cardRefs.current.get(id);
        const previousRect = previousCardRectsRef.current.get(id);
        if (!node || !previousRect) return;
        const dx = previousRect.left - nextRect.left;
        const dy = previousRect.top - nextRect.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        node.style.transition = "none";
        node.style.transform = "translate3d(" + dx + "px, " + dy + "px, 0)";
        requestAnimationFrame(() => {
          node.style.transition = "transform 260ms ease";
          node.style.transform = "translate3d(0, 0, 0)";
        });
        window.setTimeout(() => {
          node.style.transition = "";
          node.style.transform = "";
        }, 280);
      });
    }
    previousCardRectsRef.current = nextRects;
  }, [displayAdIds]);

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
            <div className="ad-task-grid mt-3" aria-label="Loading ad tasks" aria-busy="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="ad-task-card surface" aria-hidden="true">
                  <div className="ad-task-skeleton ad-task-skeleton-icon" />
                  <div className="ad-task-main">
                    <div className="ad-task-skeleton ad-task-skeleton-title" />
                    <div className="ad-task-skeleton ad-task-skeleton-description" />
                    <div className="ad-task-skeleton ad-task-skeleton-meta" />
                  </div>
                  <div className="ad-task-action">
                    <div className="ad-task-skeleton ad-task-skeleton-reward" />
                    <div className="ad-task-skeleton ad-task-skeleton-button" />
                  </div>
                </div>
              ))}
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
            {displayAdIds.map((adId) => ADS.find((item) => item.id === adId)).filter((ad): ad is Ad => Boolean(ad)).map((ad) => {
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
                  ref={(node) => {
                    if (node) cardRefs.current.set(ad.id, node);
                    else cardRefs.current.delete(ad.id);
                  }}
                  className={`surface p-3 transition-transform duration-200 ${disabled ? "opacity-60" : "hover:-translate-y-0.5"}`}
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{ad.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {ad.description || "Complete this task to earn your reward."}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                      {ad.watchSeconds}s
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-end">
                    <div className="flex items-center gap-2">
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
                          const requestId = openRequestRef.current;
                          try {
                            const id = await startAd(ad.id);
                            if (requestId !== openRequestRef.current) return;
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
                            ? "✓ Watched"
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
            const claimedAdId = selectedAd?.id ?? null;
            const reward = await completeAd(sessionId);
            if (claimedAdId) {
              setCompletedAdIds((current) => new Set(current).add(claimedAdId));
            }
            setSelectedAd(null);
            setSessionId(null);
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            await refreshLiveData();
            toast.success(isPrivilegedAccount ? "Test ad completed — no reward credited." : `Reward credited: ${money(reward)}`);
          } catch (error) {
            const message = error instanceof Error ? error.message : "Reward could not be credited";
            if (message.toLowerCase().includes("already completed today") && selectedAd) {
              setCompletedAdIds((current) => new Set(current).add(selectedAd.id));
              setSelectedAd(null);
              setSessionId(null);
              await refreshLiveData().catch(() => undefined);
              return;
            }
            await refreshLiveData().catch(() => undefined);
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
  const [htmlHeight, setHtmlHeight] = useState<number | null>(null);
  const [htmlRenderKey, setHtmlRenderKey] = useState(0);
  const [iframeScale, setIframeScale] = useState(1);
  const [iframeStage, setIframeStage] = useState({ width: 0, height: 0 });
  const [videoAspectRatio, setVideoAspectRatio] = useState(16 / 9);
  const [imageWidth, setImageWidth] = useState(520);
  const adFrameRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const htmlIframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoLastTimeRef = useRef(0);
  const playingTimeRef = useRef(0);

  const taskType = ad?.taskType ?? "watch_ad";
  const isActionTask = taskType === "join_whatsapp" || taskType === "subscribe_youtube" || taskType === "visit_website";
  const format =
    taskType === "watch_ad"
      ? String(ad?.provider ?? "").toLowerCase() === "adsterra" && ad?.adCode
        ? "adsterra"
        : ad?.htmlCode
          ? "html"
          : ad?.videoUrl
            ? "video"
            : ad?.imageUrl
              ? "image"
              : ad?.adCode
                ? "adsterra"
                : "none"
      : taskType;
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
    setHtmlHeight(null);
    setHtmlRenderKey(0);
    setIframeScale(1);
    setIframeStage({ width: 0, height: 0 });
    setVideoAspectRatio(16 / 9);
    setImageWidth(520);
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
    if (!ad || !sessionId || !isActionTask) return;
    void onAdLoaded(sessionId)
      .then(() => setAdLoaded(true))
      .catch((error) => setLoadError(error instanceof Error ? error.message : "Unable to verify task load"));
  }, [ad, sessionId, isActionTask, onAdLoaded]);

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
      setHtmlHeight(Math.ceil(height));
    };

    window.addEventListener("message", messageHandler);
    return () => window.removeEventListener("message", messageHandler);
  }, [ad, format, sessionId, htmlMessageId]);

  useEffect(() => {
    if (!ad || format !== "adsterra") return;
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

  const handleVideoLoaded = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      setVideoAspectRatio(video.videoWidth / video.videoHeight);
    }
    void handleLoaded();
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
    type: "video" | "html" | "image" | "adsterra";
    src: string;
    w?: number;
    h?: number;
  }) => {
    if (!sessionId) return null;

    if (type === "video") {
      const isVertical = videoAspectRatio < 1;
      return (
        <div
          className="task-content-video"
          style={{ aspectRatio: `${videoAspectRatio}` }}
        >
          <video
            key={mediaKey}
            ref={videoRef}
            src={src}
            muted
            autoPlay
            playsInline
            preload="auto"
            controls={false}
            onLoadedData={handleVideoLoaded}
            onCanPlay={handleVideoLoaded}
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
            className={isVertical ? "task-video task-video-vertical" : "task-video"}
          />
        </div>
      );
    }

    if (type === "html") {
      const measurementScript = `
<script>
(() => {
  const id = ${JSON.stringify(htmlMessageId)};
  let lastHeight = 0;
  const sendHeight = () => {
    const root = document.documentElement;
    const body = document.body;
    const height = Math.max(root ? root.scrollHeight : 0, root ? root.offsetHeight : 0, body ? body.scrollHeight : 0, body ? body.offsetHeight : 0);
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
      const resetStyle = `
<style>
html, body { margin: 0; padding: 0; width: 100%; max-width: 100%; box-sizing: border-box; }
*, *::before, *::after { box-sizing: border-box; }
body { overflow-x: hidden; }
img, video, canvas, iframe { max-width: 100%; }
</style>`;
      const lowerSrc = src.toLowerCase();
      const headClose = lowerSrc.indexOf("</head>");
      let srcdoc = headClose >= 0 ? src.slice(0, headClose) + resetStyle + src.slice(headClose) : resetStyle + src;
      const bodyClose = srcdoc.toLowerCase().lastIndexOf("</body>");
      srcdoc = bodyClose >= 0 ? srcdoc.slice(0, bodyClose) + measurementScript + srcdoc.slice(bodyClose) : srcdoc + measurementScript;
      return (
        <div className="task-content-html">
          <iframe
            ref={htmlIframeRef}
            key={htmlRenderKey}
            title={ad.title}
            srcDoc={srcdoc}
            onLoad={() => void handleLoaded()}
            className="task-html-frame"
            style={{ height: `${htmlHeight ?? 180}px` }}
            sandbox="allow-scripts"
            scrolling="no"
          />
        </div>
      );
    }

    if (type === "image") {
      return (
        <div className="task-content-image">
          <img
            src={src}
            alt={ad.title}
            onLoad={(event) => {
              setImageWidth(event.currentTarget.naturalWidth || 520);
              void handleLoaded();
            }}
            onError={() => {
              setAdLoaded(false);
              setLoadError("Ad failed to load");
            }}
            className="task-image"
          />
        </div>
      );
    }

    return (
      <div className="task-content-adsterra" ref={adFrameRef}>
        <div
          className="task-adsterra-stage"
          style={{
            width: iframeStage.width || iframeWidth,
            height: iframeStage.height || iframeHeight,
          }}
        >
          <iframe
            title={ad.title}
            srcDoc={src}
            width={iframeWidth}
            height={iframeHeight}
            onLoad={() => void handleLoaded()}
            className="task-adsterra-frame"
            scrolling="no"
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            allow="autoplay; fullscreen; encrypted-media"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    );
  };

  const actionSteps = (ad.description ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

  const modalClass =
    format === "html"
      ? "task-modal task-modal-html"
      : format === "video"
        ? "task-modal task-modal-video"
        : format === "image"
          ? "task-modal task-modal-image"
          : format === "adsterra"
            ? "task-modal task-modal-adsterra"
            : format === "join_whatsapp"
              ? "task-modal task-modal-whatsapp"
              : format === "subscribe_youtube"
                ? "task-modal task-modal-youtube"
                : format === "visit_website"
                  ? "task-modal task-modal-website"
                  : "task-modal task-modal-custom";

  const modalWidth =
    format === "video"
      ? videoAspectRatio < 1
        ? "360px"
        : "640px"
      : format === "image"
        ? `${Math.max(320, Math.min(520, imageWidth))}px`
        : format === "adsterra"
          ? `${Math.max(340, iframeWidth + 48)}px`
          : format === "html"
            ? "fit-content"
            : format === "join_whatsapp"
              ? "400px"
              : format === "subscribe_youtube" || format === "visit_website"
                ? "420px"
                : "480px";

  const actionIcon =
    format === "join_whatsapp" ? <MessageCircle className="size-7" /> :
    format === "subscribe_youtube" ? (
      ad.imageUrl ? <img src={ad.imageUrl} alt="" className="size-16 rounded-full object-cover" /> : <Youtube className="size-7" />
    ) :
    format === "visit_website" ? <Globe className="size-7" /> :
    <ListChecks className="size-7" />;

  const actionTitle =
    format === "join_whatsapp" ? "Join WhatsApp" :
    format === "subscribe_youtube" ? "Subscribe on YouTube" :
    format === "visit_website" ? "Visit Website" :
    "Complete Task";

  const actionLabel =
    format === "join_whatsapp" ? "Open WhatsApp" :
    format === "subscribe_youtube" ? "Open YouTube" :
    format === "visit_website" ? "Open website" :
    "";

  const websiteHost = (() => {
    if (!ad.destinationUrl) return "Open the advertiser website";
    try {
      return new URL(ad.destinationUrl, window.location.href).hostname;
    } catch {
      return "Open the advertiser website";
    }
  })();

  const openAction = () => {
    if (!ad.destinationUrl) return;
    try {
      window.open(ad.destinationUrl, "_blank", "noopener,noreferrer");
    } catch {
      // Keep this UI-only action non-blocking if the browser rejects the new window.
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && void onClose()}>
      <DialogContent
        role="dialog"
        aria-modal="true"
        aria-labelledby="ad-modal-title"
        className={`${modalClass} max-w-[calc(100vw-32px)]`}
        style={{ width: modalWidth }}
      >
        <DialogHeader className="task-modal-header">
          <DialogTitle id="ad-modal-title">{ad.title}</DialogTitle>
          <DialogDescription>{ad.advertiser}</DialogDescription>
        </DialogHeader>

        <div className="task-modal-content-wrap">
          <div
            ref={adFrameRef}
            className="task-modal-content"
          >
            {sessionId && (
              <div className="task-content-width">
                {isActionTask || format === "custom" ? (
                  <div className={format === "custom" ? "task-content-custom" : "task-content-action"}>
                    <div className="task-action-icon" aria-hidden="true">{actionIcon}</div>
                    <h3 className="task-action-title">{actionTitle}</h3>
                    {format === "custom" ? (
                      <>
                        <p className="task-custom-description">
                          {ad.description || "Complete the task using the steps below."}
                        </p>
                        <ol className="task-custom-steps">
                          {(actionSteps.length ? actionSteps : ["Complete the required task."]).map((step, index) => (
                            <li key={`${index}-${step}`}>
                              <span>{index + 1}</span>
                              <p>{step}</p>
                            </li>
                          ))}
                        </ol>
                      </>
                    ) : (
                      <>
                        <p className="task-action-description">
                          {format === "visit_website"
                            ? websiteHost
                            : ad.description || "Complete the required action to continue."}
                        </p>
                        <Button className="task-action-button" onClick={openAction} disabled={!ad.destinationUrl}>
                          {actionLabel}
                          <ExternalLink className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                ) : (
                  mountAd({
                    type: format === "video" ? "video" : format === "html" ? "html" : format === "image" ? "image" : "adsterra",
                    src: format === "video" ? ad.videoUrl ?? "" : format === "html" ? ad.htmlCode ?? "" : format === "image" ? ad.imageUrl ?? "" : ad.adCode ?? "",
                    w: iframeWidth,
                    h: iframeHeight,
                  })
                )}
              </div>
            )}

            {!sessionId ? (
              <div className="ad-loader task-loader" aria-live="polite">
                Starting secure ad session…
              </div>
            ) : (
              <div
                className="ad-loader task-loader"
                hidden={adLoaded || Boolean(loadError)}
                aria-live="polite"
              >
                Loading task…
              </div>
            )}

            {loadError && (
              <div className="task-load-error" role="alert">
                <p>{loadError}</p>
                {format === "video" && (
                  <Button size="sm" onClick={retryVideo}>
                    Retry
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="task-modal-footer">
          <Progress value={adLoaded ? Math.min(100, (elapsed / videoDuration) * 100) : 0} className="task-progress" />
          <p className="task-timer">
            {!sessionId
              ? "Opening secure session…"
              : loadError
                ? "The task could not be loaded."
                : !adLoaded
                  ? "Loading task… timer starts after the server records the visible task."
                  : remaining > 0
                    ? `Keep the task open — ${remaining}s remaining`
                    : "Task complete, claim your reward"}
          </p>
          <Button
            disabled={!adLoaded || remaining > 0 || completing}
            onClick={() => void onComplete()}
            className="task-claim"
          >
            {completing ? "Verifying…" : "Claim reward"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

