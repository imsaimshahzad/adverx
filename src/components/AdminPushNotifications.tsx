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

  const subscribePush = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("This browser does not support push notifications.");
    }

    if (Notification.permission !== "granted") {
      throw new Error("Notification permission is not granted yet.");
    }

    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;

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

      // Chrome Android can change notification permission from Site Controls
      // after the page has loaded. Subscribe immediately when it becomes granted.
      try {
        const permissionStatus = await navigator.permissions.query({ name: "notifications" as PermissionName });
        permissionStatus.onchange = () => {
          if (Notification.permission === "granted" && !enabled) {
            void subscribePush().catch((error) => {
              console.error("[AdverX] push subscription after permission change failed", error);
            });
          }
        };
      } catch {
        // Notification permission querying is not supported everywhere.
      }

      if (Notification.permission === "granted") {
        await subscribePush();
      }
    })().catch((error) => {
      console.error("[AdverX] admin push initialization failed", error);
    });
  }, [enabled]);

  if (!isAdmin) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100]">
      <button
        type="button"
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          try {
            const { data, error } = await supabase.functions.invoke("admin-push", {
              body: { action: "test_notification" },
            });

            if (error) {
              let detail = error.message;
              try {
                if ("context" in error && error.context instanceof Response) {
                  const payload = await error.context.json().catch(() => null);
                  if (payload?.error) detail = payload.error;
                }
              } catch {}
              throw new Error(detail);
            }

            const sent = Number(data?.sent ?? 0);
            if (sent > 0) {
              toast.success(`Push sent successfully 🔔 (${sent} device)`);
            } else {
              toast.error("Push service returned 0 devices. Subscription needs to be re-enabled.");
            }
          } catch (error) {
            console.error("[AdverX] test push failed", error);
            toast.error(error instanceof Error ? error.message : "Failed to send test notification.");
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy}
        className="rounded-xl border border-white/10 bg-background px-4 py-3 text-sm font-semibold shadow-xl transition hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Sending…" : "🔔 Test Notification"}
      </button>
    </div>
  );
}