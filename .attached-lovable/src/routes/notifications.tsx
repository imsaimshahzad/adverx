import { createFileRoute } from "@tanstack/react-router";
import { BellOff } from "lucide-react";
import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { usePlatform } from "@/lib/platform-store";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — AdNet Rewards" },
      {
        name: "description",
        content:
          "Deposit approvals, credited earnings, referral activity and withdrawal status updates.",
      },
      { property: "og:title", content: "Notifications — AdNet Rewards" },
      {
        property: "og:description",
        content: "Deposit, earnings, referral and withdrawal updates in one place.",
      },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { state, markNotificationsRead } = usePlatform();

  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  return (
    <AppShell title="Notifications" subtitle="Account and payment updates">
      {state.notifications.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 px-4 py-12 text-center">
          <BellOff className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        </div>
      ) : (
        <div className="surface divide-y divide-border">
          {state.notifications.map((n) => (
            <div key={n.id} className="px-4 py-3">
              <p className="text-sm font-medium">{n.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
