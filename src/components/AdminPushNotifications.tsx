import { Bell, BellOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_USER_ID = "dfe99973-80f9-480c-86e5-72519783df3";

function decodeVapidKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function AdminPushNotifications() {
  const activeSubscription = useRef<PushSubscription | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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

    if (currentJson !== previousJson) {
      const { error: subscribeError } = await supabase.functions.invoke("admin-push", {
        body: { action: "subscribe", subscription: subscription.toJSON() },
      });
      if (subscribeError) throw subscribeError;
    }

    activeSubscription.current = subscription;
  };

  const verifyAdmin = async (userId: string) => {
    if (userId !== ADMIN_USER_ID) return false;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile || profile.id !== ADMIN_USER_ID || profile.role !== "admin") return false;

    setIsAdmin(true);

    if ("Notification" in window) {
      const currentPermission = Notification.permission;
      setPermission(currentPermission);
      if (currentPermission === "granted") {
        await subscribePush();
      }
    }

    return true;
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
      }
    } catch (error) {
      console.error("[AdVerX] admin notification setup failed", error);
    } finally {
      setEnabling(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleSession = async (userId?: string) => {
      const id = userId ?? (await supabase.auth.getUser()).data.user?.id;
      if (!id || !mounted) return;
      try {
        await verifyAdmin(id);
      } catch (error) {
        console.error("[AdVerX] admin push verification failed", error);
      }
    };

    void handleSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        void handleSession(session?.user?.id);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

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
