import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { money, WITHDRAWAL_METHODS, usePlatform } from "@/lib/platform-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/withdraw")({
  head: () => ({
    meta: [
      { title: "Withdraw earnings — AdverX" },
      {
        name: "description",
        content:
          "Request a payout of your available earnings and track approval status of every withdrawal.",
      },
      { property: "og:title", content: "Withdraw earnings — AdverX" },
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
  processing: "Processing",
  paid: "Paid",
  rejected: "Rejected",
};

function WithdrawPage() {
  const { plan, state, availableBalance, requestWithdrawal } = usePlatform();
  const userDb = supabase as any;
  const min = plan?.minWithdrawal ?? 500;
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState("");
  useEffect(() => {
    if (!state.user || !methodId) return;
    void userDb.from("user_withdrawal_methods").select("details").eq("user_id", state.user.id).eq("method_id", methodId).maybeSingle().then(({ data }: { data?: { details?: Record<string, string> } | null }) => {
      if (data?.details) setDetails(data.details);
    });
  }, [methodId, state.user]);
  const [details, setDetails] = useState<Record<string, string>>({});
  const selectedMethod = WITHDRAWAL_METHODS.find((method) => method.id === methodId);
  useEffect(() => {
    if (!methodId && WITHDRAWAL_METHODS[0]) setMethodId(WITHDRAWAL_METHODS[0].id);
  }, [methodId]);
  const [submitting, setSubmitting] = useState(false);
  const requestKeyRef = useRef<string | null>(null);
  const value = Number(amount) || 0;
  const requestedPaise = Math.round(value * 100);
  const availablePaise = Math.round(Number(availableBalance) * 100);
  const minPaise = Math.round(Number(min) * 100);
  const fee = Math.round(value * 0.02 * 100) / 100;
  const methodMin = selectedMethod?.minWithdrawal ?? min;
  const methodMax = selectedMethod?.maxWithdrawal ?? Number.POSITIVE_INFINITY;
  const methodMinPaise = Math.round(Number(methodMin) * 100);
  const methodMaxPaise = Number.isFinite(methodMax) ? Math.round(Number(methodMax) * 100) : Number.POSITIVE_INFINITY;
  const amountOutsideMethodLimits = Boolean(selectedMethod && (requestedPaise < methodMinPaise || requestedPaise > methodMaxPaise));

  return (
    <AppShell
      title="Withdraw"
      subtitle={`Available ${money(availableBalance)}`}
    >
      <div className="glass-panel space-y-3 p-4 sm:p-5">
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
          {selectedMethod ? <p className="text-xs font-medium text-primary">Withdrawal limit: {money(methodMin)} – {money(methodMax)}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Payout method</Label>
          <Select value={methodId} onValueChange={setMethodId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WITHDRAWAL_METHODS.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {(["holder", ...(selectedMethod?.type.toLowerCase().includes("bank") ? ["bankName", "accountNumber", "iban"] : ["number"]) ]).map((field) => (
            <label key={field} className="grid gap-1.5 text-xs font-medium">
              {field === "holder" ? "Account Holder Name" : field === "bankName" ? "Bank Name" : field === "accountNumber" ? "Account Number" : field === "iban" ? "IBAN (optional)" : `${selectedMethod?.name ?? "Account"} Number`}
              <Input value={details[field] ?? ""} onChange={(e) => setDetails({ ...details, [field]: e.target.value })} />
            </label>
          ))}
        </div>

        <Button
          className="w-full"
          disabled={submitting || amountOutsideMethodLimits}
          onClick={async () => {
            if (submitting) return;
            if (selectedMethod && requestedPaise < methodMinPaise) {
              toast.error(`Minimum withdrawal for ${selectedMethod.name} is ${money(methodMin)}.`);
              return;
            }
            if (selectedMethod && requestedPaise > methodMaxPaise) {
              toast.error(`Maximum withdrawal for ${selectedMethod.name} is ${money(methodMax)}.`);
              return;
            }
            if (requestedPaise < minPaise) {
              toast.error(`Minimum withdrawal is ${money(min)}.`);
              return;
            }
            if (requestedPaise > availablePaise) {
              toast.error("Amount exceeds your available earnings.");
              return;
            }
            if (!selectedMethod || !details.holder?.trim() || (!details.number?.trim() && (!details.bankName?.trim() || !details.accountNumber?.trim()))) {
              toast.error("Complete all required withdrawal details.");
              return;
            }
            if (!selectedMethod) {
              toast.error("Choose a payout method.");
              return;
            }
            setSubmitting(true);
            requestKeyRef.current ??= crypto.randomUUID();
            try {
              const savedDetails = { methodId: selectedMethod.id, type: selectedMethod.type, ...details };
              await userDb.from("user_withdrawal_methods").upsert({ user_id: state.user?.id, method_id: selectedMethod.id, details: savedDetails }, { onConflict: "user_id,method_id" });
              await requestWithdrawal({
                amount: requestedPaise / 100,
                method: selectedMethod.name,
                account: JSON.stringify(savedDetails),
                requestKey: requestKeyRef.current,
              });
              setAmount("");
              setDetails({});
              requestKeyRef.current = null;
              toast.success("Withdrawal request submitted");
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Withdrawal request failed",
              );
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {submitting ? "Submitting…" : "Submit withdrawal request"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Withdrawals are reviewed and paid manually, usually within 24–72
          hours.
        </p>
      </div>

      <div className="glass-panel mt-3 divide-y divide-border/60 overflow-hidden">
        <p className="px-4 py-3 text-sm font-medium">Your requests</p>
        {state.withdrawals.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No withdrawal requests yet.
          </p>
        ) : (
          state.withdrawals.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between px-4 py-3"
            >
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
