import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, Check, Copy, ReceiptText, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { money } from "@/lib/platform-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — AdverX" },
      {
        name: "description",
        content: "A clean, human-readable record of your deposits, plan purchases, rewards, referrals and withdrawals.",
      },
    ],
  }),
  component: TransactionsPage,
});

type TransactionRow = {
  id: string;
  transaction_no: string;
  user_id: string | null;
  parent_transaction_id: string | null;
  kind: string;
  amount: number;
  currency: string;
  status: string;
  source_type: string | null;
  source_id: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  processed_at: string | null;
  balance_before?: number;
  balance_after?: number;
};

const kindLabel: Record<string, string> = {
  PLAN_PURCHASE: "Plan Purchase",
  DEPOSIT: "Deposit",
  AD_REWARD: "Ad Reward",
  REFERRAL_REWARD: "Referral Reward",
  WITHDRAWAL: "Withdrawal",
  WITHDRAWAL_FEE: "Withdrawal Fee",
  REFUND: "Refund",
  ADMIN_ADJUSTMENT: "Admin Adjustment",
  PLATFORM_PROFIT: "Platform Profit",
  UNASSIGNED_REFERRAL: "Unassigned Referral",
  ACCOUNTING_ENTRY: "Accounting Entry",
};

const kindIcon: Record<string, string> = {
  PLAN_PURCHASE: "💳",
  DEPOSIT: "💰",
  AD_REWARD: "🎬",
  REFERRAL_REWARD: "👥",
  WITHDRAWAL: "💸",
  WITHDRAWAL_FEE: "💸",
  REFUND: "↩️",
  ADMIN_ADJUSTMENT: "🛠️",
};

function labelForKind(kind: string) {
  return kindLabel[kind] ?? kind.replaceAll("_", " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function TransactionsPage() {
  const [items, setItems] = useState<TransactionRow[]>([]);
  const [accountUid, setAccountUid] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TransactionRow | null>(null);
  const [allocation, setAllocation] = useState<Record<string, unknown> | null>(null);
  const [deposit, setDeposit] = useState<Record<string, unknown> | null>(null);
  const [parent, setParent] = useState<TransactionRow | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const db = supabase as any;
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) throw new Error("Please sign in again.");

        const uid = authData.user.id;
        const { data: profile, error: profileError } = await db
          .from("profiles")
          .select("role, public_uid")
          .eq("id", uid)
          .maybeSingle();
        if (profileError) throw new Error(profileError.message);

        const staff = ["admin", "super_admin", "moderator"].includes(String(profile?.role ?? ""));
        if (mounted) {
          setAccountUid(String(profile?.public_uid ?? "").trim() || null);
          setIsStaff(staff);
        }

        let query = db.from("transactions").select("*").order("created_at", { ascending: false });
        if (!staff) query = query.eq("user_id", uid);
        const { data, error: txError } = await query.limit(500);
        if (txError) throw new Error(txError.message);

        const rows = ((data ?? []) as TransactionRow[]).map((row) => ({
          ...row,
          amount: Number(row.amount ?? 0),
          metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
        }));

        // For the user's own account we can show historical balance before/after.
        if (!staff && rows.length) {
          const { data: walletState } = await db.rpc("wallet_state", { _user_id: uid });
          let running = Number(walletState?.[0]?.available ?? 0);
          for (const row of rows) {
            const after = running;
            const before = running - row.amount;
            row.balance_before = before;
            row.balance_after = after;
            running = before;
          }
        }

        if (mounted) setItems(rows);
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : "Unable to load transactions.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  const totals = useMemo(() => {
    const credits = items.filter((x) => x.amount > 0).reduce((s, x) => s + x.amount, 0);
    const debits = items.filter((x) => x.amount < 0).reduce((s, x) => s + Math.abs(x.amount), 0);
    return { credits, debits };
  }, [items]);

  useEffect(() => {
    if (!selected) {
      setAllocation(null);
      setDeposit(null);
      setParent(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const db = supabase as any;
      const requests: Promise<any>[] = [];
      if (selected.kind === "PLAN_PURCHASE" && selected.source_type === "deposit" && selected.source_id) {
        requests.push(db.from("deposits").select("amount, status, method, transaction_id, created_at, approved_at, plan_id").eq("id", selected.source_id).maybeSingle());
        requests.push(db.from("purchase_allocations").select("gross_amount, admin_profit_amount, referral_commission_amount, recovery_fund_amount, ad_budget_amount, indirect_pool_amount_pkr, indirect_pool_distributed_pkr").eq("purchase_id", selected.source_id).maybeSingle());
      } else {
        requests.push(Promise.resolve({ data: null }));
        requests.push(Promise.resolve({ data: null }));
      }
      if (selected.parent_transaction_id) {
        requests.push(db.from("transactions").select("*").eq("id", selected.parent_transaction_id).maybeSingle());
      } else {
        requests.push(Promise.resolve({ data: null }));
      }
      const [depositResult, allocationResult, parentResult] = await Promise.all(requests);
      if (cancelled) return;
      setDeposit(depositResult.data ?? null);
      setAllocation(allocationResult.data ?? null);
      setParent(parentResult.data ?? null);
    })();
    return () => { cancelled = true; };
  }, [selected]);

  return (
    <AppShell
      title="Transactions"
      subtitle={accountUid ? `Clean account activity · UID ${accountUid}` : "Clean account activity"}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="surface p-4">
          <p className="text-xs text-muted-foreground">Transactions</p>
          <p className="mt-1 text-xl font-semibold">{items.length}</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-muted-foreground">Credits</p>
          <p className="mt-1 text-xl font-semibold text-success">+{money(totals.credits)}</p>
        </div>
        <div className="surface p-4">
          <p className="text-xs text-muted-foreground">Debits</p>
          <p className="mt-1 text-xl font-semibold text-destructive">-{money(totals.debits)}</p>
        </div>
      </div>

      <div className="surface mt-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ReceiptText className="mt-0.5 size-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Transaction Center</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Har important financial event ka apna stable Transaction ID hai. Database UUIDs aur internal ledger terminology normal view mein hidden hain.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="surface mt-4 flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <LoadingIndicator size="sm" label="Loading transactions" /> Loading transactions…
        </div>
      ) : error ? (
        <div className="surface mt-4 p-5 text-sm text-destructive">{error}</div>
      ) : items.length === 0 ? (
        <div className="surface mt-4 p-10 text-center text-sm text-muted-foreground">No transactions recorded yet.</div>
      ) : (
        <div className="glass-panel mt-4 overflow-hidden">
          <div className="hidden grid-cols-[1.1fr_1.25fr_1.6fr_.8fr_1fr] gap-4 border-b border-border/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
            <span>Date</span><span>Transaction</span><span>Description</span><span>Status</span><span className="text-right">Amount</span>
          </div>
          <div className="divide-y divide-border/60">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { setSelected(item); setCopied(false); }}
                className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/30 md:grid-cols-[1.1fr_1.25fr_1.6fr_.8fr_1fr] md:items-center md:gap-4"
              >
                <div>
                  <p className="text-sm font-medium">{new Date(item.created_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(item.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-base">{kindIcon[item.kind] ?? "•"}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{labelForKind(item.kind)}</p>
                    <p className="font-mono text-[11px] font-semibold text-primary">{item.transaction_no}</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm">{item.description ?? labelForKind(item.kind)}</p>
                  <p className="text-[11px] text-muted-foreground">{isStaff && item.user_id ? "Member transaction" : "Click for details"}</p>
                </div>
                <div><Badge variant="secondary" className="capitalize">{statusLabel(item.status)}</Badge></div>
                <p className={`num text-sm font-semibold md:text-right ${item.amount >= 0 ? "text-success" : "text-destructive"}`}>
                  {item.amount >= 0 ? "+" : "-"}{money(Math.abs(item.amount))}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div role="dialog" aria-modal="true" className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border/60 bg-background p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">{selected.description ?? labelForKind(selected.kind)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{new Date(selected.created_at).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })} · {new Date(selected.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Close"><X className="size-4" /></button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Transaction ID</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-mono text-sm font-semibold text-primary">{selected.transaction_no}</p>
                  <button type="button" className="rounded-md p-1 hover:bg-muted" onClick={() => { void navigator.clipboard?.writeText(selected.transaction_no); setCopied(true); }}>
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className={`mt-1 text-2xl font-bold ${selected.amount >= 0 ? "text-success" : "text-destructive"}`}>{selected.amount >= 0 ? "+" : "-"}{money(Math.abs(selected.amount))}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/50 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Type</p><p className="mt-1 text-sm font-medium">{labelForKind(selected.kind)}</p></div>
              <div className="rounded-xl border border-border/50 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</p><p className="mt-1"><Badge variant="secondary" className="capitalize">{statusLabel(selected.status)}</Badge></p></div>
            </div>

            {deposit ? (
              <div className="mt-3 rounded-xl border border-border/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Payment Details</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">
                  <div><span className="text-muted-foreground">Paid</span><p className="font-medium">{money(Number(deposit.amount ?? 0))}</p></div>
                  <div><span className="text-muted-foreground">Plan</span><p className="font-medium">{selected.description?.replace(" Plan Purchase","") ?? "Plan"}</p></div>
                  <div><span className="text-muted-foreground">Method</span><p className="font-medium">{String(deposit.method ?? "—")}</p></div>
                  <div><span className="text-muted-foreground">Payment Reference</span><p className="font-mono text-xs">{String(deposit.transaction_id ?? "—")}</p></div>
                </div>
              </div>
            ) : null}

            {allocation ? (
              <div className="mt-3 rounded-xl border border-border/50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Allocation Breakdown</p>
                <div className="mt-3 space-y-2 text-sm">
                  {[
                    ["Ad Reward Budget", allocation.ad_budget_amount],
                    ["Platform Profit", allocation.admin_profit_amount],
                    ["Referral Allocation", allocation.referral_commission_amount],
                    ["Recovery Fund", allocation.recovery_fund_amount],
                    ["Indirect Pool", allocation.indirect_pool_amount_pkr],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between gap-4"><span>{String(label)}</span><span className="font-medium">{money(Number(value ?? 0))}</span></div>
                  ))}
                </div>
              </div>
            ) : null}

            {parent ? (
              <div className="mt-3 rounded-xl border border-border/50 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Related Purchase</p>
                <p className="mt-1 font-mono text-sm font-semibold text-primary">{parent.transaction_no}</p>
                <p className="mt-1 text-sm">{parent.description ?? "Plan Purchase"}</p>
              </div>
            ) : null}

            {!isStaff && selected.balance_before !== undefined ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/50 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Balance Before</p><p className="mt-1 font-semibold">{money(selected.balance_before)}</p></div>
                <div className="rounded-xl border border-border/50 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Balance After</p><p className="mt-1 font-semibold">{money(selected.balance_after ?? 0)}</p></div>
              </div>
            ) : null}

            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-border/60 px-4 py-2 text-sm font-medium hover:bg-muted">Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
