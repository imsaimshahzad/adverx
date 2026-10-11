import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Copy, Upload } from "lucide-react";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { money, PAYMENT_METHODS, type Plan, usePlatform } from "@/lib/platform-store";
import { transactionIdSchema } from "@/lib/input-validation";
import { loadDepositPlan, uploadProofAndSubmitDeposit } from "@/lib/deposit-service";

export const Route = createFileRoute("/_authenticated/deposit/$planId")({
  head: () => ({ meta: [{ title: "Submit deposit — AdverX" }] }),
  component: DepositPage,
});

function DepositPage() {
  const { planId } = useParams({ from: "/_authenticated/deposit/$planId" });
  const navigate = useNavigate();
  const { submitDeposit, state } = usePlatform();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [methodId, setMethodId] = useState("");
  const [txnId, setTxnId] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadPlan = async () => {
      setLoadingPlan(true);
      setPlanError(null);
      try {
        const loadedPlan = await loadDepositPlan(planId);
        if (!cancelled) setPlan(loadedPlan);
      } catch (error) {
        if (!cancelled) setPlanError(error instanceof Error ? error.message : "Unable to load this plan.");
      } finally {
        if (!cancelled) setLoadingPlan(false);
      }
    };
    void loadPlan();
    return () => { cancelled = true; };
  }, [planId]);

  useEffect(() => { if (!methodId && PAYMENT_METHODS[0]) setMethodId(PAYMENT_METHODS[0].id); }, [loadingPlan, methodId]);

  if (loadingPlan) return <AppShell title="Submit deposit" subtitle="Preparing your deposit"><div className="surface flex flex-col gap-2 p-6 text-sm text-muted-foreground"><span className="text-base font-medium text-foreground">Preparing your deposit</span><span>We&apos;re loading the selected plan and payment details.</span></div></AppShell>;
  if (planError || !plan) return <AppShell title="Submit deposit" subtitle="Unable to continue"><div className="surface space-y-4 p-6"><p className="text-sm text-destructive">{planError ?? "Unable to load this plan."}</p><div className="flex gap-2"><Button asChild><Link to="/plans"><ArrowLeft className="mr-2 size-4" />Back to Plans</Link></Button><Button variant="outline" onClick={() => window.location.reload()}>Retry</Button></div></div></AppShell>;

  const pendingDeposit = state.deposits.find((deposit) => deposit.status === "pending");
  if (pendingDeposit) return <AppShell title="Deposit Pending" subtitle="Awaiting admin approval"><div className="surface space-y-3 p-6"><p className="text-base font-semibold">You already have a pending deposit.</p><p className="text-sm text-muted-foreground">Your PKR {pendingDeposit.amount.toLocaleString("en-PK")} deposit is currently under review. You cannot submit another deposit until this request is approved or rejected.</p><Button className="w-full" onClick={() => void navigate({ to: "/" })}>Back to Dashboard</Button></div></AppShell>;

  const method = PAYMENT_METHODS.find((m) => m.id === methodId) ?? PAYMENT_METHODS[0];
  return <AppShell title="Submit deposit" subtitle={`${plan.name} · ${money(plan.price)}`}>
    <div className="glass-panel p-4 sm:p-5">
      <Label className="text-xs">Payment method</Label>
      {PAYMENT_METHODS.length === 0 ? <p className="mt-2 text-sm text-destructive">No deposit methods are currently available.</p> : <><Select value={methodId} onValueChange={setMethodId}><SelectTrigger className="mt-1.5 w-full"><SelectValue placeholder="Choose a method" /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>{method && <div className="mt-4 rounded-lg bg-muted p-3 text-sm"><Row label="Account title" value={method.accountTitle} /><Row label="Account" value={method.accountNumber} copyable /><Row label="Amount" value={money(plan.price)} /><p className="mt-2 text-xs text-muted-foreground">{method.instructions}</p></div>}</>}
    </div>
    <div className="glass-panel mt-3 space-y-3 p-4 sm:p-5">
      <div className="space-y-1.5"><Label className="text-xs">Transaction ID</Label><Input value={txnId} onChange={(e) => setTxnId(e.target.value)} placeholder="e.g. TXN9284712" disabled={submitting} /></div>
      <div className="space-y-1.5"><Label className="text-xs">Payment proof</Label><label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-input px-3 py-4 text-sm text-muted-foreground"><Upload className="size-4" />{proofFile?.name ?? "Upload screenshot or receipt"}<input type="file" accept="image/*" className="hidden" disabled={submitting} onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} /></label></div>
      <Button className="w-full" disabled={submitting || !method} onClick={async () => {
        if (!transactionIdSchema.safeParse(txnId).success) { toast.error("Enter a valid transaction ID (3-100 characters, letters/numbers and . _ : / - only)."); return; }
        if (!proofFile) { toast.error("Upload your payment proof."); return; }
        if (proofFile.size > 5 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(proofFile.type)) { toast.error("Upload a JPG, PNG or WebP image up to 5MB."); return; }
        if (!method) { toast.error("Choose a payment method."); return; }
        setSubmitting(true);
        try {
          await uploadProofAndSubmitDeposit({
            file: proofFile,
            planId: plan.id,
            method: method.name,
            transactionId: txnId.trim(),
            submitDeposit,
          });
          toast.success("Deposit submitted for review");
          await navigate({ to: "/plans" });
        } catch (error) { toast.error(error instanceof Error ? error.message : "Deposit creation failed"); } finally { setSubmitting(false); }
      }}>{submitting ? <><LoadingIndicator size="sm" label="Submitting deposit" />Submitting…</> : "Submit for review"}</Button>
      <p className="text-center text-xs text-muted-foreground">Deposits are verified manually. Your plan activates only after approval.</p>
    </div>
  </AppShell>;
}

function Row({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) { return <div className="flex items-center justify-between gap-3 py-1"><span className="text-xs text-muted-foreground">{label}</span><span className="flex items-center gap-1.5 text-right text-sm font-medium">{value}{copyable && <button type="button" aria-label="Copy account number" onClick={() => { void navigator.clipboard.writeText(value); toast.success("Copied"); }}><Copy className="size-3.5 text-muted-foreground" /></button>}</span></div>; }
