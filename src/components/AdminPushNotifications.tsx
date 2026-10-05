import { useEffect, useRef } from "react";
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

  const initializeForAdmin = async (userId: string) => {
    if (userId !== ADMIN_USER_ID) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (!profile || profile.id !== ADMIN_USER_ID || profile.role !== "admin") return;

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
    }

    if (Notification.permission === "granted") {
      await subscribePush();
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleSession = async (userId?: string) => {
      if (!mounted) return;

      const id = userId ?? (await supabase.auth.getUser()).data.user?.id;
      if (!id) return;

      try {
        await initializeForAdmin(id);
      } catch (error) {
        console.error("[AdverX] admin push initialization failed", error);
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

  return null;
}
