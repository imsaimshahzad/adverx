import { Bell, BellOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function decodeVapidKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function AdminPushNotifications({ isAdmin }: { isAdmin: boolean }) {
  const activeSubscription = useRef<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabling, setEnabling] = useState(false);

  const subscribePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    await registration.update();

    const { data, error } = await supabase.functions.invoke("admin-push", {
      body: { action: "public_key" },
    });
    if (error) {
      let detail = error.message || "Unable to reach push service";
      try {
        const context = (error as { context?: Response }).context;
        if (context) {
          const payload = await context.clone().json().catch(() => null);
          if (payload?.error) detail = String(payload.error);
          else if (payload?.message) detail = String(payload.message);
        }
      } catch {
        // Keep the SDK error when the response body cannot be read.
      }
      throw new Error(detail);
    }
    if (!data?.publicKey) throw new Error("Push key unavailable");

    const applicationServerKey = decodeVapidKey(data.publicKey);
    if (applicationServerKey.byteLength !== 65) {
      throw new Error("Invalid VAPID public key");
    }

    let subscription = await registration.pushManager.getSubscription();

    const createSubscription = async () => {
      try {
        return await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        if (name === "AbortError") {
          // Chrome can keep a stale push-service registration after a service-worker
          // update. Remove only this browser's local registration and retry once.
          await registration.pushManager.getSubscription().then(async (current) => {
            if (current) await current.unsubscribe().catch(() => undefined);
          });
          await registration.unregister().catch(() => undefined);
          const freshRegistration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
          await navigator.serviceWorker.ready;
          return await freshRegistration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey,
          });
        }

        throw new Error(
          error instanceof DOMException
            ? `Browser push subscription failed: ${error.name}`
            : "Browser push subscription failed",
        );
      }
    };

    if (!subscription) {
      subscription = await createSubscription();
    }

    if (!subscription) throw new Error("Browser did not create a push subscription");

    const currentJson = JSON.stringify(subscription.toJSON());
    const previousJson = activeSubscription.current
      ? JSON.stringify(activeSubscription.current.toJSON())
      : null;

    if (currentJson !== previousJson || !activeSubscription.current) {
      const { error: subscribeError } = await supabase.functions.invoke("admin-push", {
        body: { action: "subscribe", subscription: subscription.toJSON() },
      });
      if (subscribeError) {
        let detail = subscribeError.message || "Unable to register this device";
        try {
          const context = (subscribeError as { context?: Response }).context;
          if (context) {
            const payload = await context.clone().json().catch(() => null);
            if (payload?.error) detail = String(payload.error);
            else if (payload?.message) detail = String(payload.message);
          }
        } catch {
          // Keep the SDK error when the response body cannot be read.
        }
        throw new Error(detail);
      }
    }

    activeSubscription.current = subscription;
  };

  const syncPermission = async () => {
    if (!("Notification" in window)) return;
    const currentPermission = Notification.permission;
    setPermission(currentPermission);
    if (currentPermission === "granted") {
      await subscribePush();
    }
  };

  const enableNotifications = async () => {
    if (!isAdmin || enabling || !("Notification" in window)) return;

    setEnabling(true);
    try {
      let nextPermission = Notification.permission;

      if (nextPermission === "denied") {
        window.alert("Notifications are blocked for AdverX. Open Chrome site settings → Notifications → Allow, then click this button again.");
        return;
      }

      if (nextPermission === "default") {
        nextPermission = await Notification.requestPermission();
      }

      setPermission(nextPermission);

      if (nextPermission === "granted") {
        await subscribePush();
        setPermission("granted");
      }
    } catch (error) {
      console.error("[AdVerX] admin notification setup failed", error);
      setPermission(Notification.permission);
      const message = error instanceof Error ? error.message : "Notification setup failed";
      window.alert(message);
    } finally {
      setEnabling(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void syncPermission();
  }, [isAdmin]);

  if (!isAdmin) return null;

  const isGranted = permission === "granted";
  const isBlocked = permission === "denied";

  return (
    <button
      type="button"
      onClick={() => void enableNotifications()}
      disabled={enabling}
      aria-label={isGranted ? "Admin notifications enabled" : isBlocked ? "Admin notifications blocked" : "Enable admin notifications"}
      title={isGranted ? "Notifications enabled" : isBlocked ? "Notifications blocked — open browser site settings to allow" : "Enable notifications"}
      className="inline-flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-foreground shadow-sm backdrop-blur transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isGranted ? <Bell className="size-4" /> : <BellOff className="size-4" />}
    </button>
  );
}
