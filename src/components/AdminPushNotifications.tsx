import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function decodeVapidKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export function AdminPushNotifications() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return;

      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", auth.user.id)
        .maybeSingle();

      if (!profile || profile.id !== "dfe99973-80f9-480c-86e5-725197e83df3" || profile.role !== "admin") return;

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      if (Notification.permission === "denied") return;
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") return;

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

      const { error: subscribeError } = await supabase.functions.invoke("admin-push", {
        body: {
          action: "subscribe",
          subscription: subscription.toJSON(),
        },
      });
      if (subscribeError) throw subscribeError;

      toast.success("Deposit alerts enabled on this device");
    })().catch((error) => {
      console.error("[AdverX] admin push setup failed", error);
    });
  }, []);

  return null;
}
