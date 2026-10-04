import { useEffect, useRef, useState } from "react";
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const enablePush = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        toast.error("This browser does not support push notifications.");
        return;
      }
      if (Notification.permission === "denied") {
        toast.error("Notifications are blocked for AdverX. Allow them in Chrome site settings and try again.");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Notification permission was not granted.");
        return;
      }

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
        body: { action: "subscribe", subscription: subscription.toJSON() },
      });
      if (subscribeError) throw subscribeError;

      setEnabled(true);
      toast.success("Deposit alerts enabled on this device");
    } catch (error) {
      console.error("[AdverX] admin push setup failed", error);
      toast.error(error instanceof Error ? error.message : "Unable to enable deposit alerts.");
    } finally {
      setBusy(false);
    }
  };

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

      setIsAdmin(true);
      if (Notification.permission === "granted") await enablePush();
    })().catch((error) => {
      console.error("[AdverX] admin push initialization failed", error);
    });
  }, []);

  if (!isAdmin || enabled) return null;

  return (
    <button
      type="button"
      onClick={() => void enablePush()}
      disabled={busy}
      className="fixed bottom-4 right-4 z-[100] rounded-full bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {busy ? "Enabling alerts…" : "🔔 Enable Deposit Alerts"}
    </button>
  );
}
