import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ReceiptText, Download } from "lucide-react";
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
  const [withdrawalHistory, setWithdrawalHistory] = useState<Array<{ id: string; amount: number | null; status: string | null; created_at: string; method?: string | null; account?: string | null; fee?: number | null }>>([]);
  const [receiptRow, setReceiptRow] = useState<{ id: string; amount: number | null; status: string | null; created_at: string; method?: string | null; account?: string | null; fee?: number | null } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const selectedMethod = WITHDRAWAL_METHODS.find((method) => method.id === methodId);

  const loadWithdrawalHistory = useCallback(async () => {
    if (!state.user?.id) return;
    setHistoryLoading(true);
    const { data } = await userDb
      .from("withdrawals")
      .select("id, amount, status, created_at, method, account, fee")
      .eq("user_id", state.user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setWithdrawalHistory(
      (data ?? []).map((row: { id: string; amount: number | null; status: string | null; created_at: string; method?: string | null; account?: string | null; fee?: number | null }) => ({
        ...row,
        fee: row.fee == null ? 0 : Number(row.fee),
        amount: row.amount == null ? null : Number(row.amount),
      })),
    );
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
      receiptNo: `ADX-WD-${row.id.replaceAll("-", "").slice(0, 12).toUpperCase()}`,
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

  function saveReceiptPdf() {
    if (!receiptRow || String(receiptRow.status).toLowerCase() !== "paid") return;
    const receipt = getReceiptDetails(receiptRow);
    const popup = window.open("", "_blank", "popup,width=520,height=760");
    if (!popup) {
      toast.error("Please allow pop-ups to save the receipt as PDF.");
      return;
    }
    const rows = [
      ["Receipt No.", receipt.receiptNo],
      ["Date", receipt.date],
      ["Account Holder", receipt.holder],
      ["Payout Method", receipt.method],
      ["Account Number", receipt.accountNumber],
      ["Amount Sent", formatMoney(receipt.amount, "PKR")],
    ];
    popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>AdverX Withdrawal Receipt</title><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#16302e;padding:clamp(8px,4vw,24px);margin:0}.receipt{width:100%;max-width:440px;margin:0 auto;border:1px solid #d9e6e4;border-radius:14px;overflow:hidden}.head{background:#0d8a80;color:white;padding:clamp(16px,4vw,22px);font-size:clamp(21px,5vw,24px);font-weight:bold}.head span{color:#f28c00}.paid{text-align:center;padding:clamp(18px,5vw,22px);color:#0d8a80}.amount{font-size:clamp(24px,7vw,30px);font-weight:bold;margin-top:8px;overflow-wrap:anywhere}.row{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px clamp(14px,4vw,20px);border-top:1px solid #d9e6e4;font-size:13px;line-height:1.45}.row span{flex:0 0 42%;color:#526966}.row b{flex:1;min-width:0;text-align:right;overflow-wrap:anywhere;word-break:break-word}.foot{text-align:center;padding:16px;background:#f8fbfa;font-size:12px;color:#6b7f7d}@media(max-width:360px){.row{flex-direction:column;gap:4px}.row span{flex-basis:auto}.row b{text-align:left;width:100%}}@media print{body{padding:0;background:#fff}.receipt{max-width:100%;border-radius:0;break-inside:avoid}.row{break-inside:avoid}}</style></head><body><div class="receipt"><div class="head">ADVER<span>X</span></div><div class="paid">Withdrawal Paid<div class="amount">${escapeReceiptText(formatMoney(receipt.amount, "PKR"))}</div></div>${rows.map(([label, value]) => `<div class="row"><span>${escapeReceiptText(label)}</span><b>${escapeReceiptText(value)}</b></div>`).join("")}<div class="foot">Computer-generated receipt · adverx.online</div></div><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
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
                    <p className="num text-sm font-semibold">{formatMoney(item.amount, "PKR").replace(/^\+/, "")}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Badge className={`shrink-0 rounded-full border-0 px-2.5 py-1 text-[11px] font-medium ${statusClass}`}>
                    {statusLabel}
                  </Badge>
                  {status === "paid" ? (
                    <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setReceiptRow(item)}>
                      <ReceiptText className="mr-1.5 h-4 w-4" /> Receipt
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Dialog open={Boolean(receiptRow)} onOpenChange={(open) => { if (!open) setReceiptRow(null); }}>
        <DialogContent className="max-h-[90dvh] w-[calc(100vw-1rem)] max-w-md overflow-y-auto sm:w-full">
          <DialogHeader>
            <DialogTitle>AdverX Withdrawal Receipt</DialogTitle>
            <DialogDescription>Receipt details are generated from your saved withdrawal record.</DialogDescription>
          </DialogHeader>
          {receiptRow ? (() => {
            const receipt = getReceiptDetails(receiptRow);
            return (
              <div className="w-full min-w-0 overflow-hidden rounded-xl border border-border bg-card">
                <div className="bg-primary px-5 py-4 text-primary-foreground">
                  <p className="text-xl font-extrabold tracking-wide">ADVER<span className="text-amber-400">X</span></p>
                  <p className="mt-1 text-xs opacity-85">Withdrawal Receipt</p>
                </div>
                <div className="px-5 py-6 text-center">
                  <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-emerald-500/10 text-xl font-bold text-emerald-600">✓</div>
                  <p className="mt-3 text-2xl font-bold">{formatMoney(receipt.amount, "PKR")}</p>
                  <Badge className="mt-2 border-0 bg-emerald-500/10 text-emerald-700">Paid</Badge>
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
                    <div key={label} className="flex min-w-0 flex-col gap-1 py-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <span className="text-xs text-muted-foreground sm:text-sm">{label}</span>
                      <span className="min-w-0 break-words text-left font-semibold [overflow-wrap:anywhere] sm:max-w-[62%] sm:text-right">{value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-muted/40 px-5 py-4 text-center text-xs leading-relaxed text-muted-foreground">
                  Computer-generated receipt.<br />adverx.online
                </div>
              </div>
            );
          })() : null}
          <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2">
            <Button type="button" variant="outline" className="w-full" onClick={saveReceiptImage}><Download className="mr-2 h-4 w-4" /> Save Image</Button>
            <Button type="button" className="w-full" onClick={saveReceiptPdf}>Save as PDF</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
