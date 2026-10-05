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
    if (error || !data?.publicKey) throw error ?? new Error("Push key unavailable");

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(data.publicKey),
      });
    }

    const currentJson = JSON.stringify(subscription.toJSON());
    const previousJson = activeSubscription.current
      ? JSON.stringify(activeSubscription.current.toJSON())
      : null;

    if (currentJson !== previousJson || !activeSubscription.current) {
      const { error: subscribeError } = await supabase.functions.invoke("admin-push", {
        body: { action: "subscribe", subscription: subscription.toJSON() },
      });
      if (subscribeError) throw subscribeError;
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
      disabled={enabling || isBlocked}
      aria-label={isGranted ? "Admin notifications enabled" : isBlocked ? "Admin notifications blocked" : "Enable admin notifications"}
      title={isGranted ? "Notifications enabled" : isBlocked ? "Notifications are blocked in browser settings" : "Enable notifications"}
      className="inline-flex size-9 items-center justify-center rounded-xl border border-border/70 bg-background/80 text-foreground shadow-sm backdrop-blur transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isGranted ? <Bell className="size-4" /> : <BellOff className="size-4" />}
    </button>
  );
}
