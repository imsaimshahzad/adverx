import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { money, PAYMENT_METHODS, usePlatform } from "@/lib/platform-store";

export const Route = createFileRoute("/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw earnings — AdNet Rewards" },
      {
        name: "description",
        content:
          "Request a payout of your available earnings and track approval status of every withdrawal.",
      },
      { property: "og:title", content: "Withdraw earnings — AdNet Rewards" },
      {
        property: "og:description",
        content: "Request payouts and track the status of every withdrawal.",
      },
    ],
  }),
  component: WithdrawPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  under_review: "Under review",
  approved: "Approved",
  paid: "Paid",
  rejected: "Rejected",
};

function WithdrawPage() {
  const { availableBalance, plan, state, requestWithdrawal } = usePlatform();
  const min = plan?.minWithdrawal ?? 500;
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState(PAYMENT_METHODS[0]!.id);
  const [account, setAccount] = useState("");
  const value = Number(amount) || 0;
  const fee = Math.round(value * 0.02 * 100) / 100;

  return (
    <AppShell title="Withdraw" subtitle={`Available ${money(availableBalance)}`}>
      <div className="surface space-y-3 p-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Amount</Label>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Minimum ${money(min)}`}
          />
          <p className="text-xs text-muted-foreground">
            Processing fee 2% · You receive {money(Math.max(0, value - fee))}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Payout method</Label>
          <Select value={methodId} onValueChange={setMethodId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Account details</Label>
          <Input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Account number / IBAN"
          />
        </div>

        <Button
          className="w-full"
          onClick={() => {
            if (value < min) {
              toast.error(`Minimum withdrawal is ${money(min)}.`);
              return;
            }
            if (value > availableBalance) {
              toast.error("Amount exceeds your available earnings.");
              return;
            }
            if (!account.trim()) {
              toast.error("Enter your payout account details.");
              return;
            }
            requestWithdrawal({
              amount: value,
              method: PAYMENT_METHODS.find((m) => m.id === methodId)!.name,
              account: account.trim(),
            });
            setAmount("");
            setAccount("");
            toast.success("Withdrawal request submitted");
          }}
        >
          Submit withdrawal request
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Withdrawals are reviewed and paid manually, usually within 24–72 hours.
        </p>
      </div>

      <div className="surface mt-3 divide-y divide-border">
        <p className="px-4 py-3 text-sm font-medium">Your requests</p>
        {state.withdrawals.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No withdrawal requests yet.
          </p>
        ) : (
          state.withdrawals.map((w) => (
            <div key={w.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="num text-sm font-semibold">{money(w.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {w.method} · {new Date(w.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant="secondary">{STATUS_LABEL[w.status]}</Badge>
            </div>
          ))
        )}
      </div>
    </AppShell>
  );
}
