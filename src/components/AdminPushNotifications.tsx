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
  const adminVerified = useRef(false);
  const permissionRequested = useRef(false);

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

    adminVerified.current = true;
    return true;
  };

  const requestPermissionAndSubscribe = async () => {
    if (!adminVerified.current || permissionRequested.current) return;
    if (!("Notification" in window)) return;

    permissionRequested.current = true;

    try {
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;
      }

      if (Notification.permission === "granted") {
        await subscribePush();
      }
    } catch (error) {
      console.error("[AdverX] admin push setup failed", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const handleSession = async (userId?: string) => {
      if (!mounted) return;
      const id = userId ?? (await supabase.auth.getUser()).data.user?.id;
      if (!id) return;

      const isAdmin = await verifyAdmin(id);
      if (!isAdmin) return;

      // Let the browser finish the admin sign-in/navigation before requesting permission.
      // This keeps the permission flow isolated to the verified admin session.
      window.setTimeout(() => {
        if (mounted) void requestPermissionAndSubscribe();
      }, 250);
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
