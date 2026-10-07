import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LoadingIndicator } from "@/components/LoadingIndicator";
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
import { WITHDRAWAL_METHODS, usePlatform } from "@/lib/platform-store";
import { formatMoney } from "@/lib/display";
import { isImpersonating } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";
import { amountSchema, supportTextSchema, uuidSchema } from "@/lib/input-validation";

export const Route = createFileRoute("/_authenticated/withdraw")({
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
  const { plan, state, availableBalance, ready, requestWithdrawal } = usePlatform();
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
  const [withdrawalHistory, setWithdrawalHistory] = useState<Array<{ id: string; amount: number | null; status: string | null; created_at: string }>>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const selectedMethod = WITHDRAWAL_METHODS.find((method) => method.id === methodId);

  const loadWithdrawalHistory = useCallback(async () => {
    if (!state.user?.id) return;
    setHistoryLoading(true);
    const { data } = await userDb
      .from("withdrawals")
      .select("id, amount, status, created_at")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setWithdrawalHistory(
      (data ?? []).map((row: { id: string; amount: number | null; status: string | null; created_at: string }) => ({
        ...row,
        amount: row.amount == null ? null : Number(row.amount),
      })),
    );
    setHistoryLoading(false);
  }, [state.user?.id]);
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
    <AppShell title="Withdraw">
      <div className="mb-3 surface px-4 py-3 sm:px-5">
        <p className="text-sm font-medium">Withdrawable Balance</p>
        <div className="mt-1 flex min-h-7 items-center gap-2">
          {ready ? <p className="num text-xl font-semibold">{formatMoney(availableBalance)}</p> : <LoadingIndicator size="sm" label="Loading withdrawable balance" />}
        </div>
      </div>
      <div className="glass-panel space-y-3 p-4 sm:p-5">
        <div className="space-y-1.5">
          <Label className="text-xs">Withdrawal Amount</Label>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount here"
          />
          <p className="text-xs text-muted-foreground">
            Processing fee 2% · You receive {formatMoney(Math.max(0, value - fee))}
          </p>
          {selectedMethod ? <p className="text-xs font-medium text-primary">Withdrawal limit: {formatMoney(methodMin)} – {formatMoney(methodMax)}</p> : null}
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
              toast.error(`Minimum withdrawal for ${selectedMethod.name} is ${formatMoney(methodMin)}.`);
              return;
            }
            if (selectedMethod && requestedPaise > methodMaxPaise) {
              toast.error(`Maximum withdrawal for ${selectedMethod.name} is ${formatMoney(methodMax)}.`);
              return;
            }
            if (!amountSchema.safeParse(requestedPaise / 100).success) { toast.error("Enter a valid withdrawal amount."); return; }
            if (!selectedMethod || !uuidSchema.safeParse(selectedMethod.id).success) { toast.error("Choose a valid payout method."); return; }
            if (!supportTextSchema.safeParse(details.holder ?? "").success) { toast.error("Enter a valid account holder name."); return; }
            if (requestedPaise < minPaise) {
              toast.error(`Minimum withdrawal is ${formatMoney(min)}.`);
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
              toast.success("Withdrawal request submitted");\n              void loadWithdrawalHistory();
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

      <div className="surface mt-3 overflow-hidden">
        <div className="border-b border-border/60 p-4">
          <p className="text-sm font-semibold">Withdrawal history</p>
          <p className="mt-1 text-xs text-muted-foreground">Your recent withdrawal requests and their current status.</p>
        </div>
        {historyLoading ? (
          <div className="p-5 text-center text-xs text-muted-foreground">Loading withdrawal history…</div>
        ) : withdrawalHistory.length === 0 ? (
          <div className="p-5 text-center text-xs text-muted-foreground">No withdrawals yet.</div>
        ) : (
          <div className="divide-y divide-border/50">
            {withdrawalHistory.map((item) => {
              const status = String(item.status ?? "pending").toLowerCase();
              const statusLabel = STATUS_LABEL[status] ?? status.replaceAll("_", " ");
              const statusClass =
                status === "approved" || status === "paid"
                  ? "bg-success/10 text-success"
                  : status === "rejected"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground";
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="num text-sm font-semibold">{formatMoney(item.amount, "PKR")}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Badge className={`shrink-0 rounded-full border-0 px-2.5 py-1 text-[11px] font-medium ${statusClass}`}>
                    {statusLabel}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
