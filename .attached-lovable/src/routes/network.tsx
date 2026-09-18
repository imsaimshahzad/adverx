import { createFileRoute } from "@tanstack/react-router";
import { Copy, Share2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { AppShell, StatTile } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePlatform } from "@/lib/platform-store";
import { referralUrl } from "@/lib/referrals";

export const Route = createFileRoute("/network")({
  head: () => ({
    meta: [
      { title: "My network — AdNet Rewards" },
      {
        name: "description",
        content:
          "Invite friends with your referral link and track total, active and newly joined network members.",
      },
      { property: "og:title", content: "My network — AdNet Rewards" },
      {
        property: "og:description",
        content: "Invite friends and track your active network members.",
      },
    ],
  }),
  component: NetworkPage,
});

function NetworkPage() {
  const { state } = usePlatform();
  const members = state.network;
  const active = members.filter((m) => m.active).length;
  const thisMonth = members.filter(
    (m) => new Date(m.joinedAt).getMonth() === new Date().getMonth(),
  ).length;
  const code = state.user?.referralCode ?? "—";
  const link = referralUrl(code);

  return (
    <AppShell title="My network" subtitle="Invite friends and grow your active members">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Total" value={`${members.length}`} />
        <StatTile label="Active" value={`${active}`} />
        <StatTile label="This month" value={`+${thisMonth}`} />
      </div>

      <div className="surface mt-3 p-4">
        <p className="text-sm font-medium">Your referral code</p>
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2.5">
          <span className="num text-base font-semibold tracking-wider">{code}</span>
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

      <div className="surface mt-3 divide-y divide-border">
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
                  Joined {new Date(m.joinedAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={m.active ? "default" : "secondary"}>
                {m.active ? "Active" : "Inactive"}
              </Badge>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
