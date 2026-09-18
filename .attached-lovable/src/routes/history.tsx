import { createFileRoute } from "@tanstack/react-router";

import { AppShell, StatTile } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { money, usePlatform, type LedgerEntry } from "@/lib/platform-store";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Transaction history — AdNet Rewards" },
      {
        name: "description",
        content:
          "A transparent record of every deposit, ad reward, referral reward and withdrawal on your account.",
      },
      { property: "og:title", content: "Transaction history — AdNet Rewards" },
      {
        property: "og:description",
        content: "Every deposit, reward and withdrawal recorded transparently.",
      },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { state, availableBalance, totalWithdrawn, pendingEarnings } = usePlatform();
  const rewards = state.ledger.filter(
    (e) => e.type === "ad_reward" || e.type === "referral_reward",
  );
  const payouts = state.ledger.filter((e) => e.type === "withdrawal");

  return (
    <AppShell title="History" subtitle="Your complete transaction record">
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Available" value={money(availableBalance)} />
        <StatTile label="Pending" value={money(pendingEarnings)} />
        <StatTile label="Withdrawn" value={money(totalWithdrawn)} />
      </div>

      <Tabs defaultValue="all" className="mt-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <LedgerList entries={state.ledger} />
        </TabsContent>
        <TabsContent value="rewards">
          <LedgerList entries={rewards} />
        </TabsContent>
        <TabsContent value="payouts">
          <LedgerList entries={payouts} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function LedgerList({ entries }: { entries: LedgerEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="surface mt-3 px-4 py-10 text-center text-sm text-muted-foreground">
        No transactions yet.
      </div>
    );
  }
  return (
    <div className="surface mt-3 divide-y divide-border">
      {entries.map((e) => (
        <div key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{e.label}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(e.createdAt).toLocaleString()}
              {e.reference ? ` · ${e.reference}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={`num text-sm font-semibold ${e.debit ? "text-destructive" : "text-success"}`}
            >
              {e.debit ? `- ${money(e.debit)}` : `+ ${money(e.credit)}`}
            </p>
            <Badge variant="secondary" className="mt-1">
              {e.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
