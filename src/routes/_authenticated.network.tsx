import { createFileRoute } from "@tanstack/react-router";
import { Copy, Share2, UserPlus } from "lucide-react";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { toast } from "sonner";

import { AppShell, StatTile } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlatform } from "@/lib/platform-store";
import { referralUrl } from "@/lib/referrals";

export const Route = createFileRoute("/network")({
  head: () => ({
    meta: [
      { title: "My network — AdverX" },
      {
        name: "description",
        content:
          "Invite friends with your referral link and track total, active and newly joined network members.",
      },
      { property: "og:title", content: "My network — AdverX" },
      {
        property: "og:description",
        content: "Invite friends and track your active network members.",
      },
    ],
  }),
  component: NetworkPage,
});

function NetworkPage() {
  const { state, ready, dataError } = usePlatform();
  const members = state.network;
  const active = members.filter((m) => m.active).length;
  const thisMonth = members.filter(
    (m) => new Date(m.joinedAt).getMonth() === new Date().getMonth(),
  ).length;
  const code = state.user?.referralCode ?? "—";
  const link = referralUrl(code);

  return (
    <AppShell title="My network" subtitle="Invite friends and grow your active members">
      {!ready ? <div className="surface flex items-center gap-2 p-4 text-sm text-muted-foreground"><LoadingIndicator size="sm" label="Loading your network" /> Loading your network…</div> : dataError ? <div className="surface p-4 text-sm text-destructive">Unable to load your network. {dataError}</div> : null}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Total" value={`${members.length}`} />
        <StatTile label="Active" value={`${active}`} />
        <StatTile label="No plan" value={`${members.filter((m) => !m.active).length}`} />
        <StatTile label="This month" value={`+${thisMonth}`} />
        <StatTile label="Commission" value={`Rs. ${members.reduce((total, member) => total + member.commission, 0).toLocaleString("en-PK")}`} />
      </div>

      <div className="glass-panel mt-3 p-4">
        <p className="text-sm font-medium">Your referral code</p>
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2.5">
          <span className="num truncate text-base font-semibold tracking-wider">{code}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(code);
              toast.success("Referral code copied");
            }}
          >
            <Copy className="size-4" /> Copy
          </Button>
        </div>
        <Button
          className="mt-3 w-full"
          onClick={() => {
            void navigator.clipboard.writeText(link);
            toast.success("Invite link copied");
          }}
        >
          <Share2 className="size-4" /> Invite friends
        </Button>
      </div>

      <div className="glass-panel mt-3 divide-y divide-border/60 overflow-hidden">
        <p className="px-4 py-3 text-sm font-medium">Members</p>
        {members.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <UserPlus className="size-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No members yet</p>
            <p className="text-xs text-muted-foreground">
              Share your invite link to start building your network.
            </p>
          </div>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.planName} · Joined {new Date(m.joinedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right"><Badge variant={m.active ? "default" : "secondary"}>{m.status}</Badge><p className="mt-1 text-xs text-muted-foreground">Rs. {m.commission.toLocaleString("en-PK")}</p></div>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
