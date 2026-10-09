import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ReceiptText, Download, ArrowUpRight, Clock3, CircleX, Info } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [withdrawalHistory, setWithdrawalHistory] = useState<Array<{ id: string; reference_code?: string | null; amount: number | null; status: string | null; created_at: string; method?: string | null; account?: string | null; fee?: number | null; rejectionReason?: string | null }>>([]);
  const [reasonRow, setReasonRow] = useState<{ id: string; reference_code?: string | null; amount: number | null; rejectionReason?: string | null } | null>(null);
  const [receiptRow, setReceiptRow] = useState<{ id: string; reference_code?: string | null; amount: number | null; status: string | null; created_at: string; method?: string | null; account?: string | null; fee?: number | null } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const selectedMethod = WITHDRAWAL_METHODS.find((method) => method.id === methodId);

  const loadWithdrawalHistory = useCallback(async () => {
    if (!state.user?.id) return;
    setHistoryLoading(true);
    const { data, error } = await userDb
      .from("withdrawals")
      .select("id, reference_code, amount, status, created_at, method, account, fee, rejection_reason")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) {
      console.error("[AdverX] Failed to load withdrawal history:", error);
      setHistoryLoading(false);
      return;
    }
    const rows = (data ?? []) as Array<{ id: string; reference_code?: string | null; amount: number | null; status: string | null; created_at: string; method?: string | null; account?: string | null; fee?: number | null; rejection_reason?: string | null }>;
    setWithdrawalHistory(rows.map((row) => ({
      ...row,
      fee: row.fee == null ? 0 : Number(row.fee),
      amount: row.amount == null ? null : Number(row.amount),
      rejectionReason: row.rejection_reason?.trim() || null,
    })));
    setHistoryLoading(false);
  }, [state.user?.id]);
  useEffect(() => {
    if (!methodId && WITHDRAWAL_METHODS[0]) setMethodId(WITHDRAWAL_METHODS[0].id);
  }, [methodId]);
  useEffect(() => {
    void loadWithdrawalHistory();
  }, [loadWithdrawalHistory]);
  const [submitting, setSubmitting] = useState(false);
  const requestKeyRef = useRef<string | null>(null);
  const value = Number(amount) || 0;
  const requestedPaise = Math.round(value * 100);
  const availablePaise = Math.round(Number(availableBalance) * 100);
  const minPaise = Math.round(Number(min) * 100);
  const methodMin = selectedMethod?.minWithdrawal ?? min;
  const methodMax = selectedMethod?.maxWithdrawal ?? Number.POSITIVE_INFINITY;
  const methodMinPaise = Math.round(Number(methodMin) * 100);
  const methodMaxPaise = Number.isFinite(methodMax) ? Math.round(Number(methodMax) * 100) : Number.POSITIVE_INFINITY;
  const amountOutsideMethodLimits = Boolean(selectedMethod && (requestedPaise < methodMinPaise || requestedPaise > methodMaxPaise));

  function getReceiptDetails(row: NonNullable<typeof receiptRow>) {
    let details: Record<string, unknown> = {};
    try {
      const parsed = row.account ? JSON.parse(row.account) : {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) details = parsed as Record<string, unknown>;
    } catch {
      details = {};
    }
    const holder = String(details.holder ?? "—");
    const accountNumber = String(details.number ?? details.accountNumber ?? details.iban ?? "—");
    return {
      receiptNo: row.reference_code || `WD-${row.id.replaceAll("-", "").slice(0, 10).toUpperCase()}`,
      date: row.created_at ? new Date(row.created_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" }) : "—",
      holder,
      method: row.method || "—",
      accountNumber,
      amount: Number(row.amount ?? 0),
    };
  }

  function escapeReceiptText(value: string) {
    const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
    return value.replace(/[&<>"']/g, (character) => entities[character] ?? character);
  }



  function saveReceiptImage() {
    if (!receiptRow || String(receiptRow.status).toLowerCase() !== "paid") return;
    const receipt = getReceiptDetails(receiptRow);
    const canvas = document.createElement("canvas");
    canvas.width = 900;
    canvas.height = 1040;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Unable to create receipt image.");
      return;
    }
    context.fillStyle = "#eef3f2";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.fillRect(80, 55, 740, 930);
    context.fillStyle = "#0d8a80";
    context.fillRect(80, 55, 740, 130);
    context.fillStyle = "#ffffff";
    context.font = "bold 52px Arial";
    context.fillText("ADVER", 120, 125);
    context.fillStyle = "#f28c00";
    context.fillText("X", 285, 125);
    context.font = "24px Arial";
    context.fillStyle = "#e3f4f2";
    context.fillText("Withdrawal Receipt", 550, 125);
    context.textAlign = "center";
    context.fillStyle = "#0d8a80";
    context.font = "bold 30px Arial";
    context.fillText("PAID", 450, 245);
    context.font = "bold 54px Arial";
    context.fillStyle = "#16302e";
    context.fillText(formatMoney(receipt.amount, "PKR"), 450, 315);
    const rows: Array<[string, string]> = [
      ["Receipt No.", receipt.receiptNo],
      ["Date", receipt.date],
      ["Account Holder", receipt.holder],
      ["Payout Method", receipt.method],
      ["Account Number", receipt.accountNumber],
      ["Amount Sent", formatMoney(receipt.amount, "PKR")],
    ];
    context.textAlign = "left";
    rows.forEach(([label, value], index) => {
      const y = 405 + index * 75;
      context.strokeStyle = "#d9e6e4";
      context.beginPath();
      context.moveTo(115, y - 35);
      context.lineTo(785, y - 35);
      context.stroke();
      context.font = "25px Arial";
      context.fillStyle = "#6b7f7d";
      context.fillText(label, 120, y);
      context.font = "bold 25px Arial";
      context.fillStyle = "#16302e";
      const clipped = value.length > 27 ? value.slice(0, 24) + "…" : value;
      context.textAlign = "right";
      context.fillText(clipped, 780, y);
      context.textAlign = "left";
    });
    context.textAlign = "center";
    context.font = "20px Arial";
    context.fillStyle = "#6b7f7d";
    context.fillText("Computer-generated receipt · adverx.online", 450, 945);
    const link = document.createElement("a");
    link.download = `${receipt.receiptNo}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

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
            No processing fee · You receive {formatMoney(value)}
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
              toast.success("Withdrawal request submitted");
              void loadWithdrawalHistory();
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

      <div className="surface mt-3 overflow-hidden rounded-2xl">
        <div className="border-b border-border/60 px-4 py-4 sm:px-6">
          <p className="text-base font-semibold">Withdrawal history</p>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Your recent withdrawal requests and their current status.</p>
        </div>
        {historyLoading ? (
          <div className="p-5 text-center text-xs text-muted-foreground">Loading withdrawal history…</div>
        ) : withdrawalHistory.length === 0 ? (
          <div className="p-5 text-center text-xs text-muted-foreground">No withdrawals yet.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {withdrawalHistory.map((item) => {
              const status = String(item.status ?? "pending").toLowerCase();
              const isPaid = status === "paid";
              const isRejected = status === "rejected";
              const statusLabel = STATUS_LABEL[status] ?? status.replaceAll("_", " ");
              const tone = isPaid
                ? { icon: "bg-teal-500/10 text-teal-600", badge: "bg-teal-500/10 text-teal-700 dark:text-teal-300" }
                : isRejected
                  ? { icon: "bg-red-500/10 text-red-600", badge: "bg-red-500/10 text-red-700 dark:text-red-300" }
                  : { icon: "bg-amber-500/10 text-amber-700", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300" };
              return (
                <div key={item.id} className="grid grid-cols-1 items-center gap-2 px-3 py-3 transition-colors hover:bg-muted/20 sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                  <div className="flex min-w-0 items-center gap-2 sm:gap-4">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone.icon} sm:h-11 sm:w-11`}>
                    {isPaid ? <ArrowUpRight className="h-5 w-5" /> : isRejected ? <CircleX className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="num whitespace-nowrap text-xs font-bold sm:text-[17px]">{formatMoney(item.amount, "PKR").replace(/^\+/, "")}</p>
                    <p className="whitespace-nowrap text-[10px] text-muted-foreground sm:mt-1 sm:text-xs">{new Date(item.created_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  </div>
                  </div>
                  <div className="min-w-0 justify-self-start sm:justify-self-center">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold whitespace-nowrap ${tone.badge} sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />{statusLabel}
                    </span>
                  </div>
                  <div className="min-w-0 justify-self-end">
                    {isPaid ? (
                      <Button type="button" className="h-8 w-auto gap-1 px-2 text-[10px] sm:h-9 sm:gap-2 sm:px-3 sm:text-sm" size="sm" onClick={() => setReceiptRow(item)}>
                        <ReceiptText className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /><span className="sm:hidden">Receipt</span><span className="hidden sm:inline">View receipt</span>
                      </Button>
                    ) : isRejected ? (
                      <Button type="button" variant="outline" className="h-8 w-auto gap-1 border-red-500/30 bg-red-500/5 px-2 text-[10px] text-red-700 hover:bg-red-500/10 dark:text-red-300 sm:h-9 sm:gap-2 sm:px-3 sm:text-sm" size="sm" onClick={() => setReasonRow(item)}>
                        <Info className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" /><span className="sm:hidden">Reason</span><span className="hidden sm:inline">View reason</span>
                      </Button>
                    ) : (
                      <p className="max-w-[5.5rem] text-right text-[10px] leading-tight text-muted-foreground sm:max-w-[150px] sm:text-xs">Receipt after payment</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Dialog open={Boolean(receiptRow)} onOpenChange={(open) => { if (!open) setReceiptRow(null); }}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-[min(24rem,calc(100vw-1rem))] overflow-hidden p-2 sm:max-w-[26rem] sm:p-4">
          <DialogHeader className="space-y-0.5">
            <DialogTitle className="text-sm sm:text-base">AdverX Withdrawal Receipt</DialogTitle>
            <DialogDescription className="text-[10px] sm:text-xs">Generated from your saved withdrawal record.</DialogDescription>
          </DialogHeader>
          {receiptRow ? (() => {
            const receipt = getReceiptDetails(receiptRow);
            return (
              <div className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card">
                <div className="bg-primary px-4 py-2 text-primary-foreground sm:px-5 sm:py-3">
                  <p className="text-lg font-extrabold tracking-wide sm:text-xl">ADVER<span className="text-amber-400">X</span></p>
                  <p className="text-[11px] opacity-85">Withdrawal Receipt</p>
                </div>
                <div className="px-3 py-2.5 text-center sm:px-5 sm:py-3">
                  <div className="mx-auto grid h-7 w-7 place-items-center rounded-full bg-emerald-500/10 text-base font-bold text-emerald-600 sm:h-9 sm:w-9">✓</div>
                  <p className="mt-1 text-lg font-bold sm:text-xl">{formatMoney(receipt.amount, "PKR")}</p>
                  <Badge className="mt-1 border-0 bg-emerald-500/10 px-2 py-0 text-xs text-emerald-700">Paid</Badge>
                </div>
                <div className="divide-y divide-border border-t border-dashed border-border px-3 sm:px-5">
                  {[
                    ["Receipt No.", receipt.receiptNo],
                    ["Date", receipt.date],
                    ["Account Holder", receipt.holder],
                    ["Payout Method", receipt.method],
                    ["Account Number", receipt.accountNumber],
                    ["Amount Sent", formatMoney(receipt.amount, "PKR")],
                  ].map(([label, value]) => (
                    <div key={label} className="flex min-w-0 items-start justify-between gap-2 py-1.5 text-[11px] sm:gap-4 sm:py-2 sm:text-xs">
                      <span className="w-[38%] shrink-0 text-muted-foreground">{label}</span>
                      <span className="min-w-0 flex-1 break-words text-right font-semibold [overflow-wrap:anywhere]">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-muted/40 px-3 py-2 text-center text-[10px] leading-snug text-muted-foreground sm:px-5 sm:py-2 sm:text-xs">
                  Computer-generated receipt.<br />adverx.online
                </div>
              </div>
            );
          })() : null}
          <DialogFooter className="grid grid-cols-2 gap-2 sm:gap-2">
            <Button type="button" variant="outline" size="sm" className="h-8 w-full px-1.5 text-[11px] sm:text-xs" onClick={saveReceiptImage}><Download className="mr-1 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" /> Save Image</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(reasonRow)} onOpenChange={(open) => { if (!open) setReasonRow(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive"><CircleX className="h-5 w-5" /> Withdrawal rejected</DialogTitle>
            <DialogDescription>
              {reasonRow ? `${formatMoney(reasonRow.amount, "PKR")} · ADX-WD-${reasonRow.id.replaceAll("-", "").slice(0, 12).toUpperCase()}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Reason from admin</p>
            <div className="rounded-lg border-l-[3px] border-destructive bg-muted/50 px-3 py-3 text-sm leading-relaxed">
              {reasonRow?.rejectionReason || "No reason was added by the admin."}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" className="w-full" onClick={() => setReasonRow(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
