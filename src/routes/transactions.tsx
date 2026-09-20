import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownLeft, ArrowUpRight, ReceiptText } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { money } from "@/lib/platform-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transaction History — AdverX" },
      {
        name: "description",
        content: "Complete account history for plan purchases, rewards, referrals, withdrawals and wallet adjustments.",
      },
    ],
  }),
  component: TransactionsPage,
});

type Tx = {
  id: string;
  createdAt: number;
  category: string;
  title: string;
  detail: string;
  amount: number;
  direction: "credit" | "debit";
  status: string;
};

const labelMap: Record<string, string> = {
  AD_REWARD: "Ad Reward",
  TASK_REWARD: "Task Reward",
  REWARD: "Reward",
  REFERRAL_REWARD: "Referral Reward",
  REFERRAL_COMMISSION: "Referral Commission",
  WITHDRAWAL: "Withdrawal",
  WITHDRAWAL_FEE: "Withdrawal Fee",
  REFUND: "Refund",
  ADMIN_ADJUSTMENT: "Wallet Adjustment",
  WITHDRAWAL_REFUND: "Withdrawal Refund",
  PLAN_PURCHASE: "Plan Purchase",
  DEPOSIT: "Deposit",
  PLATFORM_ADMIN_PROFIT: "Platform Profit",
  UNASSIGNED_REFERRAL: "Unassigned Referral",
};

function TransactionsPage() {
  const [items, setItems] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const { data: profile, error: profileError } = await db.from("profiles").select("role").eq("id", uid).maybeSingle();
        if (profileError) throw new Error(profileError.message);

        const isAdmin = ["admin", "super_admin", "moderator"].includes(String(profile?.role ?? ""));
        const [
          { data: wallet, error: walletError },
          { data: ledger, error: ledgerError },
          { data: deposits, error: depositsError },
          { data: withdrawals, error: withdrawalsError },
        ] = await Promise.all([
          db.from("wallet_transactions").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
          db.from("ledger_entries").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
          db.from("deposits").select("id, plan_id, amount, status, method, transaction_id, created_at, plan:plans(name)").eq("user_id", uid).order("created_at", { ascending: false }),
          db.from("withdrawals").select("id, amount, fee, method, status, created_at").eq("user_id", uid).order("created_at", { ascending: false }),
        ]);

        if (walletError && ledgerError) throw new Error(walletError.message || ledgerError.message);
        if (depositsError) throw new Error(depositsError.message);
        if (withdrawalsError) throw new Error(withdrawalsError.message);

        const depositRows = (deposits ?? []) as any[];
        const depositById = new Map(depositRows.map((d) => [String(d.id), d]));
        const allowedTypes = new Set(
          isAdmin
            ? ["PLAN_PURCHASE", "AD_REWARD", "TASK_REWARD", "REWARD", "REFERRAL_REWARD", "REFERRAL_COMMISSION", "PLATFORM_ADMIN_PROFIT", "UNASSIGNED_REFERRAL", "WITHDRAWAL", "WITHDRAWAL_FEE", "REFUND", "ADMIN_ADJUSTMENT", "WITHDRAWAL_REFUND"]
            : ["PLAN_PURCHASE", "AD_REWARD", "TASK_REWARD", "REWARD", "REFERRAL_REWARD", "REFERRAL_COMMISSION", "WITHDRAWAL", "WITHDRAWAL_FEE", "REFUND", "ADMIN_ADJUSTMENT", "WITHDRAWAL_REFUND"],
        );

        const rows: Tx[] = [];
        for (const row of [...((wallet ?? []) as any[]), ...((ledger ?? []) as any[])]) {
          const type = String(row.type ?? row.entry_type ?? "").toUpperCase();
          if (!allowedTypes.has(type)) continue;

          const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
          const note = String(row.note ?? row.description ?? row.reason ?? "");
          const auditText = `${String(metadata.reason ?? "")} ${note}`.toLowerCase();
          if (auditText.includes("old admin test") || auditText.includes("test cleanup") || auditText.includes("test reversal")) continue;

          const rawAmount = Number(row.amount ?? 0);
          const credit = row.credit != null ? Number(row.credit) : rawAmount > 0 ? rawAmount : 0;
          const debit = row.debit != null ? Number(row.debit) : rawAmount < 0 ? Math.abs(rawAmount) : 0;
          const reference = String(row.reference_id ?? "");
          const deposit = depositById.get(reference);
          const planName = deposit?.plan?.name ?? "";
          let direction: "credit" | "debit" = credit > 0 && debit === 0 ? "credit" : "debit";
          let amount = credit > 0 ? credit : debit;
          if (type === "PLAN_PURCHASE" && rawAmount < 0) { direction = "debit"; amount = Math.abs(rawAmount); }
          if (!amount) continue;

          rows.push({
            id: `${type}-${row.id}`,
            createdAt: new Date(row.created_at).getTime(),
            category: labelMap[type] ?? (type.replaceAll("_", " ").replace(/\b\w/g, (m: string) => m.toUpperCase()) || "Transaction"),
            title: type === "PLAN_PURCHASE" ? (planName ? `${planName} Plan Purchase` : "Plan Purchase") : (labelMap[type] ?? "Account Transaction"),
            detail: deposit
              ? `${deposit.method ?? "Payment"} · ${deposit.status ?? "recorded"}${deposit.transaction_id ? ` · ${deposit.transaction_id}` : ""}`
              : note || (type === "UNASSIGNED_REFERRAL" ? "Referral allocation received by platform" : type === "PLATFORM_ADMIN_PROFIT" ? "Platform profit from approved plan purchase" : "Account transaction"),
            amount, direction, status: String(row.status ?? "recorded"),
          });
        }

        if (!isAdmin) {
          for (const row of (withdrawals ?? []) as any[]) {
            rows.push({
              id: `withdrawal-${row.id}`,
              createdAt: new Date(row.created_at).getTime(),
              category: "Withdrawal",
              title: "Withdrawal Request",
              detail: `${row.method ?? "Payout"} · ${row.status ?? "pending"}`,
              amount: Number(row.amount ?? 0), direction: "debit", status: String(row.status ?? "pending"),
            });
          }
        }

        const seen = new Set<string>();
        const unique = rows.filter((row) => row.amount > 0).sort((a, b) => b.createdAt - a.createdAt).filter((row) => {
          const key = `${row.category}|${row.amount}|${row.createdAt}|${row.title}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        if (mounted) setItems(unique);
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Unable to load transaction history.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, []);

  return (
    <AppShell title="Transaction History" subtitle="Every important account movement in one place">
      <div className="surface p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ReceiptText className="mt-0.5 size-5 text-primary" />
          <div>
            <p className="text-sm font-semibold">Complete account history</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Plan purchases, money received, ad rewards, referral commissions, withdrawals and adjustments are recorded here with their date and source.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="surface mt-3 flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <LoadingIndicator size="sm" label="Loading transaction history" /> Loading transaction history…
        </div>
      ) : error ? (
        <div className="surface mt-3 p-5 text-sm text-destructive">{error}</div>
      ) : items.length === 0 ? (
        <div className="surface mt-3 p-10 text-center text-sm text-muted-foreground">No transactions recorded yet.</div>
      ) : (
        <div className="glass-panel mt-3 overflow-hidden">
          <div className="hidden grid-cols-[1.1fr_1.2fr_1.5fr_.9fr_.8fr] gap-4 border-b border-border/60 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
            <span>Date</span><span>Category</span><span>Source / Details</span><span>Status</span><span className="text-right">Amount</span>
          </div>
          <div className="divide-y divide-border/60">
            {items.map((item) => (
              <div key={item.id} className="grid gap-3 px-4 py-4 md:grid-cols-[1.1fr_1.2fr_1.5fr_.9fr_.8fr] md:items-center md:gap-4">
                <div>
                  <p className="text-sm font-medium">{new Date(item.createdAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}</p>
                  <p className="text-[11px] text-muted-foreground">{new Date(item.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.direction === "credit" ? <ArrowDownLeft className="size-4 text-success" /> : <ArrowUpRight className="size-4 text-destructive" />}
                  <div><p className="text-sm font-medium">{item.title}</p><p className="text-[11px] text-muted-foreground">{item.category}</p></div>
                </div>
                <p className="text-xs text-muted-foreground md:truncate">{item.detail}</p>
                <div><Badge variant="secondary">{item.status}</Badge></div>
                <p className={`num text-sm font-semibold md:text-right ${item.direction === "credit" ? "text-success" : "text-destructive"}`}>
                  {item.direction === "credit" ? "+" : "-"}{money(item.amount)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
