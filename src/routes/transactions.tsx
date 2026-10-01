import { createFileRoute } from "@tanstack/react-router";
import { Copy, Check, ReceiptText, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { TransactionRow } from "@/components/TransactionRow";
import { Badge } from "@/components/ui/badge";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { formatDate, formatMoney, plainDescription, shortId, statusBadge, typeLabel } from "@/lib/display";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — AdverX" },
      { name: "description", content: "Clean wallet activity for deposits, rewards, referrals and withdrawals." },
    ],
  }),
  component: TransactionsPage,
});

type TransactionRowData = {
  id: string;
  transaction_no?: string | null;
  user_id: string | null;
  parent_transaction_id?: string | null;
  kind: string;
  amount: number | null;
  currency?: string | null;
  status: string | null;
  source_type: string | null;
  source_id: string | null;
  description: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  processed_at?: string | null;
};

function TransactionsPage() {
  const [items, setItems] = useState<TransactionRowData[]>([]);
  const [accountUid, setAccountUid] = useState<string | null>(null);
  const [isStaff, setIsStaff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<TransactionRowData | null>(null);
  const [copied, setCopied] = useState(false);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [activityFilter, setActivityFilter] = useState<"all" | "deposits" | "withdrawals" | "rewards" | "referrals">("all");

  const lastLiveRefreshRef = useRef(0);
  const loadVersionRef = useRef(0);

  const load = useCallback(async () => {
    const requestVersion = ++loadVersionRef.current;
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
        if (requestVersion !== loadVersionRef.current) return;
        setAccountUid(String(profile?.public_uid ?? "").trim() || null);
        setIsStaff(staff);

        // This page is the signed-in user's wallet activity, including when the user is staff.
        // Admin-wide transaction monitoring belongs in the admin area, not the personal wallet.
        const query = db
          .from("transactions")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .order("transaction_no", { ascending: false });
        const { data, error: txError } = await query.limit(500);
        if (txError) throw new Error(txError.message);

        const rows = ((data ?? []) as TransactionRowData[]).map((row) => ({
          ...row,
          amount: row.amount == null ? null : Number(row.amount),
          metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
        }));

        // Keep the existing wallet-state read intact; display never derives or estimates balances.
        if (!staff) await db.rpc("wallet_state", { _user_id: uid });

        if (requestVersion === loadVersionRef.current) setItems(rows);
      } catch (cause) {
        if (requestVersion === loadVersionRef.current) setError(cause instanceof Error ? cause.message : "Unable to load transactions.");
      } finally {
        if (requestVersion === loadVersionRef.current) setLoading(false);
      }
  }, []);

  useEffect(() => {
    void load();
    const refreshIfDue = () => {
      const now = Date.now();
      if (now - lastLiveRefreshRef.current < 10_000) return;
      lastLiveRefreshRef.current = now;
      void load();
    };
    const onFocus = () => refreshIfDue();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshIfDue();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshIfDue();
    }, 30_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(poll);
    };
  }, [load]);

  const visibleItems = [...items]
    .filter((item) => {
      if (activityFilter === "all") return true;
      const kind = String(item.kind ?? "").toLowerCase();
      const source = String(item.source_type ?? "").toLowerCase();
      if (activityFilter === "deposits") return kind.includes("deposit") || source.includes("deposit") || kind.includes("purchase");
      if (activityFilter === "withdrawals") return kind.includes("withdrawal") || source.includes("withdrawal");
      if (activityFilter === "rewards") return kind.includes("reward") || source.includes("reward") || kind.includes("ad_reward");
      return kind.includes("referral") || source.includes("referral");
    })
    .sort((a, b) => {
      const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (diff !== 0) return sortOrder === "newest" ? -diff : diff;
      return String(a.transaction_no ?? a.id).localeCompare(String(b.transaction_no ?? b.id)) * (sortOrder === "newest" ? -1 : 1);
    });

  const selectedStatus = selected ? statusBadge(selected.status) : null;
  const selectedType = selected ? typeLabel(selected.kind, selected.metadata) : null;

  return (
    <AppShell title="Transactions" subtitle={accountUid ? `Wallet activity · ${accountUid}` : "Wallet activity"}>
      <div className="surface mt-4 overflow-hidden">
        <div className="flex items-start gap-3 border-b border-border/60 p-4 sm:p-5">
          <ReceiptText className="mt-0.5 size-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Activity</p>
            <p className="mt-1 text-xs text-muted-foreground">Your deposits, withdrawals, rewards and referral activity.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
            <LoadingIndicator size="sm" label="Loading activity" /> Loading activity…
          </div>
        ) : error ? (
          <div className="p-5 text-sm text-destructive">{error}</div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No activity yet.</div>
        ) : (
          <>
            <div className="hidden grid-cols-[minmax(150px,1.1fr)_minmax(150px,1fr)_minmax(180px,1.6fr)_minmax(90px,.8fr)_minmax(110px,.8fr)] gap-3 border-b border-border/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
              <span>Type</span><span>Description</span><span>Date</span><span>Status</span><span className="text-right">Amount</span>
            </div>
            <div className="flex flex-col gap-3 border-b border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">{visibleItems.length} {visibleItems.length === 1 ? "activity" : "activities"}</p>
              <div className="flex flex-wrap gap-2">
                <label className="sr-only" htmlFor="activity-filter">Activity type</label>
                <select id="activity-filter" value={activityFilter} onChange={(event) => setActivityFilter(event.target.value as typeof activityFilter)} className="rounded-lg border border-border/60 bg-background px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="all">All Activity</option>
                  <option value="deposits">Deposits</option>
                  <option value="withdrawals">Withdrawals</option>
                  <option value="rewards">Rewards</option>
                  <option value="referrals">Referral Activity</option>
                </select>
                <label className="sr-only" htmlFor="activity-sort">Sort activity</label>
                <select id="activity-sort" value={sortOrder} onChange={(event) => setSortOrder(event.target.value as typeof sortOrder)} className="rounded-lg border border-border/60 bg-background px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>
            <div>
              {visibleItems.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No activity matches this filter.</div>
              ) : visibleItems.map((item) => (
                <TransactionRow key={item.id} row={item} onClick={() => { setSelected(item); setCopied(false); }} />
              ))}
            </div>
          </>
        )}
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div role="dialog" aria-modal="true" className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border/60 bg-background p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">{selectedType?.icon} {selectedType?.label ?? "Other"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(selected.created_at)}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Close"><X className="size-4" /></button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Transaction ID</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-mono text-sm font-semibold text-primary">{shortId(selected.id)}</p>
                  <button type="button" className="rounded-md p-1 hover:bg-muted" onClick={() => { void navigator.clipboard?.writeText(shortId(selected.id)); setCopied(true); }}>
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className={`mt-1 text-2xl font-bold ${Number(selected.amount ?? 0) < 0 ? "text-destructive" : "text-success"}`}>
                  {formatMoney(selected.amount, selected.currency ?? "PKR")}
                </p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/50 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Type</p><p className="mt-1 text-sm font-medium">{selectedType?.label ?? "Other"}</p></div>
              <div className="rounded-xl border border-border/50 p-3"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</p><p className="mt-1"><Badge className={selectedStatus?.className}>{selectedStatus?.label ?? "—"}</Badge></p></div>
            </div>

            <div className="mt-3 rounded-xl border border-border/50 p-4">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Description</p>
              <p className="mt-1 text-sm">{plainDescription(selected.kind, selected.metadata)}</p>
            </div>

            {isStaff ? (
              <div className="mt-4 rounded-xl border border-border/50 p-4">
                <p className="text-xs font-semibold">Admin technical details</p>
                <p className="mt-1 text-xs text-muted-foreground">Technical fields stay hidden in the normal view.</p>
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
