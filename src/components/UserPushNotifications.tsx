import { Bell, BellOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

function decodeVapidKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function UserPushNotifications({ userId }: { userId?: string | null }) {
  const activeSubscription = useRef<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [enabling, setEnabling] = useState(false);

  const subscribePush = async () => {
    if (
      !userId ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) return;

    if (Notification.permission !== "granted") return;

    let registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    registration = await navigator.serviceWorker.ready;

    const { data, error } = await supabase.functions.invoke("user-push", {
      body: { action: "public_key" },
    });
    if (error) throw new Error(error.message || "Unable to reach notification service");
    if (!data?.publicKey) throw new Error("Push key unavailable");

    const applicationServerKey = decodeVapidKey(data.publicKey);
    if (applicationServerKey.byteLength !== 65) {
      throw new Error("Invalid VAPID public key");
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    }

    const currentJson = JSON.stringify(subscription.toJSON());
    const previousJson = activeSubscription.current
      ? JSON.stringify(activeSubscription.current.toJSON())
      : null;

    if (currentJson !== previousJson || !activeSubscription.current) {
      const { error: subscribeError } = await supabase.functions.invoke("user-push", {
        body: { action: "subscribe", subscription: subscription.toJSON() },
      });
      if (subscribeError) {
        throw new Error(subscribeError.message || "Unable to register this device");
      }
    }

    activeSubscription.current = subscription;
  };

  useEffect(() => {
    if (!userId || !("Notification" in window)) return;

    const current = Notification.permission;
    setPermission(current);

    if (current === "granted") {
      void subscribePush().catch((error) => {
        console.error("[AdVerX] user notification sync failed", error);
      });
    }
  }, [userId]);

  const enableNotifications = async () => {
    if (!userId || enabling || !("Notification" in window)) return;

    setEnabling(true);
    try {
      let nextPermission = Notification.permission;

      if (nextPermission === "denied") {
        window.alert(
          "Notifications are blocked for AdverX. Open browser site settings → Notifications → Allow, then try again.",
        );
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
      console.error("[AdVerX] user notification setup failed", error);
      setPermission(Notification.permission);
      window.alert(error instanceof Error ? error.message : "Notification setup failed");
    } finally {
      setEnabling(false);
    }
  };

  if (!userId) return null;

  const isGranted = permission === "granted";
  const isBlocked = permission === "denied";

  return (
    <button
      type="button"
      onClick={() => void enableNotifications()}
      disabled={enabling}
      aria-label={
        isGranted
          ? "Notifications enabled"
          : isBlocked
            ? "Notifications blocked"
            : "Enable notifications"
      }
      title={
        isGranted
          ? "Notifications enabled"
          : isBlocked
            ? "Notifications blocked — open browser site settings to allow"
            : "Enable notifications"
      }
      className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isGranted ? <Bell className="size-4" /> : <BellOff className="size-4" />}
    </button>
  );
}
