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
  const [showEnableButton, setShowEnableButton] = useState(false);
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
    setShowEnableButton(false);
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
      if (Notification.permission === "granted") {
        await subscribePush();
      } else if (Notification.permission === "default") {
        setShowEnableButton(true);
      }
    }

    return true;
  };

  const enableNotifications = async () => {
    if (!isAdmin || enabling || !("Notification" in window)) return;

    setEnabling(true);
    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        await subscribePush();
      } else {
        setShowEnableButton(false);
      }
    } catch (error) {
      console.error("[AdverX] admin notification permission failed", error);
    } finally {
      setEnabling(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleSession = async (userId?: string) => {
      if (!mounted) return;
      const id = userId ?? (await supabase.auth.getUser()).data.user?.id;
      if (!id) return;

      const verified = await verifyAdmin(id);
      if (!verified || !mounted) return;
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

  if (!isAdmin || !showEnableButton) return null;

  return (
    <button
      type="button"
      onClick={() => void enableNotifications()}
      disabled={enabling}
      className="fixed bottom-5 right-5 z-[9999] rounded-lg px-4 py-3 text-sm font-medium shadow-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-60"
    >
      {enabling ? "Enabling notifications..." : "Enable notifications"}
    </button>
  );
}
