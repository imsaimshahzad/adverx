import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { Copy, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
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
import { money, PAYMENT_METHODS, PLANS, usePlatform } from "@/lib/platform-store";

export const Route = createFileRoute("/deposit/$planId")({
  head: () => ({
    meta: [
      { title: "Submit deposit — AdNet Rewards" },
      {
        name: "description",
        content:
          "Send your plan payment, enter the transaction ID and upload proof for manual verification.",
      },
      { property: "og:title", content: "Submit deposit — AdNet Rewards" },
      {
        property: "og:description",
        content: "Send payment, enter the transaction ID and upload proof for verification.",
      },
    ],
  }),
  component: DepositPage,
});

function DepositPage() {
  const { planId } = useParams({ from: "/deposit/$planId" });
  const plan = PLANS.find((p) => p.id === planId) ?? PLANS[0]!;
  const { submitDeposit } = usePlatform();
  const navigate = useNavigate();
  const [methodId, setMethodId] = useState(PAYMENT_METHODS[0]!.id);
  const [txnId, setTxnId] = useState("");
  const [proof, setProof] = useState("");

  const method = PAYMENT_METHODS.find((m) => m.id === methodId)!;

  return (
    <AppShell title="Submit deposit" subtitle={`${plan.name} · ${money(plan.price)}`}>
      <div className="surface p-4">
        <Label className="text-xs">Payment method</Label>
        <Select value={methodId} onValueChange={setMethodId}>
          <SelectTrigger className="mt-1.5 w-full">
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

        <div className="mt-4 rounded-lg bg-muted p-3 text-sm">
          <Row label="Account title" value={method.accountTitle} />
          <Row label="Account" value={method.accountNumber} copyable />
          <Row label="Amount" value={money(plan.price)} />
          <p className="mt-2 text-xs text-muted-foreground">{method.instructions}</p>
        </div>
      </div>

      <div className="surface mt-3 space-y-3 p-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Transaction ID</Label>
          <Input
            value={txnId}
            onChange={(e) => setTxnId(e.target.value)}
            placeholder="e.g. TXN9284712"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Payment proof</Label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 py-4 text-sm text-muted-foreground">
            <Upload className="size-4" />
            {proof || "Upload screenshot or receipt"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setProof(e.target.files?.[0]?.name ?? "")}
            />
          </label>
        </div>
        <Button
          className="w-full"
          onClick={() => {
            if (!txnId.trim()) {
              toast.error("Enter the transaction ID from your payment.");
              return;
            }
            if (!proof) {
              toast.error("Upload your payment proof.");
              return;
            }
            submitDeposit({
              planId: plan.id,
              method: method.name,
              transactionId: txnId.trim(),
              proofName: proof,
            });
            toast.success("Deposit submitted for review");
            navigate({ to: "/" });
          }}
        >
          Submit for review
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Deposits are verified manually. Your plan activates only after approval.
        </p>
      </div>
    </AppShell>
  );
}

function Row({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 text-right text-sm font-medium">
        {value}
        {copyable && (
          <button
            type="button"
            aria-label="Copy account number"
            onClick={() => {
              void navigator.clipboard.writeText(value);
              toast.success("Copied");
            }}
          >
            <Copy className="size-3.5 text-muted-foreground" />
          </button>
        )}
      </span>
    </div>
  );
}
