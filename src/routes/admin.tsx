import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  Check,
  Copy,
  Eye,
  Inbox,
  Sparkles,
  BookOpen,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  RefreshCw,
  X,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LoadingButtonContent, LoadingIndicator, LoadingScreen } from "@/components/LoadingIndicator";
import { BrandLogo } from "@/components/BrandLogo";
import { HomepageHeroSettings } from "@/components/HomepageHeroSettings";
import { SupportTicketPanel } from "@/components/SupportTicketPanel";
import "@/admin-design.css";
import "@/morphic-system.css";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminModule,
  type AdminRow,
  adjustLedger,
  amount,
  getReserveSummary,
  getOperationsOverview,
  getAdminProfitLedger,
  getAdminProfitSummary,
  getReferrerRecoveryReserve,
  getRecoveryFundActivity,
  getRevenuePlans,
  useRecoveryFund,
  getUsersPage,
  getUserDetails,
  approveDeposit,
  deleteOrArchive,
  dispatchNotification,
  formatValue,
  insertRow,
  saveManagementRow,
  queryCount,
  queryRows,
  transitionRow,
  reviewWithdrawal,
  replySupportTicket,
  setUserStatus,
} from "@/lib/admin-service";

const db = supabase as any;

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin operations — AdverX" }] }),
  component: AdminRoute,
});
type Icon = typeof Users;
type UserPartition = "all" | "paid" | "unpaid" | "starter" | "growth" | "pro";

type UserClassification = {
  paid: boolean;
  plan: "starter" | "growth" | "pro" | null;
  system: boolean;
};

type UserCounts = {
  all: number;
  paid: number;
  unpaid: number;
  starter: number;
  growth: number;
  pro: number;
};

function classifyUser(row: AdminRow): UserClassification {
  const role = String(row.role ?? row.account_role ?? "").toLowerCase();
  const accountType = String(row.account_type ?? row.user_type ?? "").toLowerCase();
  const system = row.is_admin === true || row.is_system === true || ["admin", "super_admin", "moderator", "system"].includes(role) || ["admin", "system"].includes(accountType);
  const nestedPlan = row.plan && typeof row.plan === "object" ? row.plan as Record<string, unknown> : null;
  const planName = String(row.active_plan_name ?? row.plan_name ?? row.plan_title ?? row.plan_name_snapshot ?? nestedPlan?.name ?? "").toLowerCase();
  const plan = planName.includes("starter") ? "starter" : planName.includes("growth") ? "growth" : planName.includes("pro") ? "pro" : null;
  const planStatus = String(row.user_plan_status ?? row.plan_status ?? row.subscription_status ?? "").toLowerCase();
  const hasActivePlan = row.has_active_plan === true || row.active_plan === true || row.plan_active === true || planStatus === "active" || planStatus === "paid";
  return { paid: !system && hasActivePlan && Boolean(plan), plan: hasActivePlan ? plan : null, system };
}

function mapUserForDisplay(row: AdminRow): AdminRow {
  const classification = classifyUser(row);
  const name = String(row.full_name ?? row.username ?? row.email ?? "Unknown user").trim() || "Unknown user";
  const safeUid = String(row.public_uid ?? row.username ?? row.email ?? "").trim() || "User";
  const planLabel = classification.system
    ? "Pro / System"
    : classification.plan
      ? `${classification.plan.slice(0, 1).toUpperCase()}${classification.plan.slice(1)}`
      : "No Plan";
  return {
    ...row,
    user: name,
    user_name: name,
    user_uid: safeUid,
    plan: planLabel,
    payment: classification.system ? "System/Admin" : classification.paid ? "Paid" : "Unpaid",
  };
}

function userSearchText(row: AdminRow) {
  const classification = classifyUser(row);
  return [
    row.full_name,
    row.username,
    row.email,
    row.phone,
    row.public_uid,
    row.role,
    row.account_role,
    row.active_plan_name,
    classification.plan,
    classification.system ? "system admin" : classification.paid ? "paid" : "unpaid",
    row.plan,
    row.payment,
  ]
    .filter((value) => value !== null && value !== undefined)
    .join(" ")
    .toLowerCase();
}

const menu: Array<[AdminModule, string, Icon]> = [
  ["overview", "Overview", LayoutDashboard],
  ["users", "Users", Users],
  ["plans", "Plans", BookOpen],
  ["tasks", "Tasks / Ads", BarChart3],
  ["advertisers", "Advertisers", CircleDollarSign],
  ["revenue", "Revenue", WalletCards],
  ["reward-pool", "Reward Pool", CircleDollarSign],
  ["reserves", "User Reward Reserves", CircleDollarSign],
  ["deposits", "Deposits", WalletCards],
  ["deposit-methods", "Deposit Methods", WalletCards],
  ["withdrawal-methods", "Withdrawal Methods", WalletCards],
  ["withdrawals", "Withdrawals", WalletCards],
  ["referrals", "Referrals", Users],
  ["referral-commissions", "Referral Commissions", TrendingUp],
  ["ledger", "Wallet Ledger", FileText],
  ["fraud", "Fraud & Risk", Flag],
  ["reports", "Reports", BarChart3],
  ["settings", "Settings", Settings],
  ["notifications", "Notifications", Bell],
  ["support", "Support", FileText],
  ["audit-logs", "Audit Logs", ShieldCheck],
];
const tableFor: Partial<Record<AdminModule, string>> = {
  users: "profiles",
  plans: "plans",
  reserves: "user_plans",
  tasks: "ads",
  advertisers: "advertiser_revenue",
  revenue: "advertiser_revenue",
  deposits: "deposits",
  "deposit-methods": "deposit_methods",
  "withdrawal-methods": "withdrawal_methods",
  withdrawals: "withdrawals",
  referrals: "referrals",
  "referral-commissions": "referral_commissions",
  ledger: "ledger_entries",
  fraud: "fraud_flags",
  notifications: "notifications",
  support: "support_tickets",
  "audit-logs": "audit_log",
};
const statusActions: Partial<Record<AdminModule, string[]>> = {
  users: ["active", "restricted", "suspended"],
  plans: ["active", "inactive", "archived"],
  tasks: ["active", "paused", "archived"],
  revenue: ["pending", "verified", "rejected"],
  deposits: ["pending", "approved", "rejected"],
  withdrawals: ["pending", "approved", "paid", "rejected"],
  fraud: ["open", "reviewed", "resolved", "false_positive"],
  support: ["open", "in_progress", "resolved", "closed"],
};

function AdminRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorization, setAuthorization] = useState<"checking" | "authorized" | "unauthorized">("checking");
  const [error, setError] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("Admin");
  const [active, setActive] = useState<AdminModule>("overview");
  const [rows, setRows] = useState<Record<string, AdminRow[]>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [statusPartition, setStatusPartition] = useState<"pending" | "approved" | "rejected">("pending");
  const [userPartition, setUserPartition] = useState<"all" | "paid" | "unpaid" | "starter" | "growth" | "pro">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [adsFilter, setAdsFilter] = useState<"active" | "archived" | "all">("active");
  const [receipt, setReceipt] = useState<{
    url: string | null;
    state: "loading" | "ready" | "unavailable" | "expired";
  } | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminRow | null>(null);
  const [balanceTarget, setBalanceTarget] = useState<AdminRow | null>(null);
  const [balanceMode, setBalanceMode] = useState<"add" | "deduct">("add");
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceReason, setBalanceReason] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<{
    row: AdminRow;
    status: string;
  } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [replyTarget, setReplyTarget] = useState<AdminRow | null>(null);
  const [replyText, setReplyText] = useState("");
  const [editingRow, setEditingRow] = useState<AdminRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminRow | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [reserveSummary, setReserveSummary] = useState<AdminRow[]>([]);
  const [overview, setOverview] = useState<Record<string, number>>({});
  const [profitSummary, setProfitSummary] = useState<AdminRow>({});
  const [profitLedger, setProfitLedger] = useState<AdminRow[]>([]);
  const [referrerRecoveryReserve, setReferrerRecoveryReserve] = useState(0);
  const [revenuePlans, setRevenuePlans] = useState<AdminRow[]>([]);
  const loadVersion = useRef(0);
  const adminIdentity = useRef<{ id: string; name: string } | null>(null);
  const [userPageRows, setUserPageRows] = useState<AdminRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [detailUserId, setDetailUserId] = useState<string | null>(() => new URLSearchParams(window.location.search).get("user"));
  const [detailData, setDetailData] = useState<AdminRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const openUserDetails = useCallback((userId: string) => {
    const row = rows.users?.find((item) => String(item.id) === userId);
    const publicUid = String(row?.public_uid ?? userId);
    navigate({ to: "/users/detail/$publicUid", params: { publicUid } });
  }, [navigate, rows.users]);
  const closeUserDetails = useCallback(() => {
    window.history.pushState({}, "", "/admin");
    setDetailUserId(null);
    setDetailData(null);
  }, []);
  useEffect(() => {
    const onPopState = () => {
      setDetailUserId(new URLSearchParams(window.location.search).get("user"));
      setDetailData(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    if (!detailUserId) return;
    let cancelled = false;
    setDetailLoading(true);
    void getUserDetails(detailUserId)
      .then((data) => { if (!cancelled) setDetailData(data); })
      .catch((cause) => { if (!cancelled) toast.error(cause instanceof Error ? cause.message : "Unable to load user details."); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [detailUserId]);
  const load = useCallback(async () => {
    if (location.pathname === "/admin/login") return;
    const requestVersion = ++loadVersion.current;
    const isInitialAuthorization = !adminIdentity.current;
    setRefreshing(true);
    if (isInitialAuthorization) {
      setLoading(true);
      setAuthorization("checking");
      setRows({});
      setCounts({});
    }
    setError(null);
    try {
      if (isInitialAuthorization) {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (authError || !auth.user) {
          setAuthorization("unauthorized");
          navigate({ to: "/admin/login", replace: true });
          return;
        }
        const { data: profile, error: profileError } = await db
          .from("profiles")
          .select("id, role, full_name")
          .eq("id", auth.user.id)
          .maybeSingle();
        const allowed = !profileError && ["admin", "super_admin", "moderator"].includes(profile?.role);
        if (!allowed) {
          setAuthorization("unauthorized");
          return;
        }
        const name = profile?.full_name || auth.user.email?.split("@")[0] || "Admin";
        adminIdentity.current = { id: auth.user.id, name };
        setAuthorization("authorized");
        setAdminName(name);
      }
      const tables = [
        ...new Set(
          Object.values(tableFor).concat([
            "profiles",
            "deposits",
            "withdrawals",
            "advertiser_revenue",
            "ledger_entries",
            "referrals",
            "referral_commissions",
            "fraud_flags",
            "support_tickets",
            "notifications",
            "deposit_methods",
          ]),
        ),
      ];
      const results = await Promise.allSettled(
        tables.map(async (table) => [table, await queryRows(table)] as const),
      );
      const next: Record<string, AdminRow[]> = {};
      const failures: string[] = [];
      for (const result of results) {
        if (result.status === "fulfilled") {
          next[result.value[0]] = result.value[1];
        } else {
          failures.push(result.reason?.message || "query failed");
        }
      }
      if (requestVersion !== loadVersion.current) return;
      setRows(next);
      try {
        const [summary, operational] = await Promise.all([getReserveSummary(), getOperationsOverview()]);
        setReserveSummary(summary);
        setOverview(operational as Record<string, number>);
      } catch {
        setReserveSummary([]);
        setOverview({});
      }
  if (active === "revenue") {
  const revenueLoad = async () => {
    try {
      const summary = await getAdminProfitSummary();
      setProfitSummary(summary);
    } catch (error) {
      console.error("[admin] revenue summary load failed", error);
    }

    try {
      const ledger = await getAdminProfitLedger();
      const userIds = [...new Set(ledger.map((row) => String(row.user_id ?? "")).filter(Boolean))];
      const { data: profiles } = userIds.length
        ? await (supabase as any).from("profiles").select("id, public_uid, full_name, username").in("id", userIds)
        : { data: [] };
      const profileMap = new Map((profiles ?? []).map((profile: any) => [String(profile.id), profile]));
      setProfitLedger(ledger.map((row) => {
        const profile: any = profileMap.get(String(row.user_id ?? ""));
        return { ...row, user_display: profile ? `${profile.full_name || profile.username || "User"} · ${profile.public_uid}` : "User" };
      }));
    } catch (error) {
      console.error("[admin] revenue ledger load failed", error);
    }

    try {
      setRevenuePlans(await getRevenuePlans());
    } catch (error) {
      console.error("[admin] revenue plans load failed", error);
    }

    try {
      setReferrerRecoveryReserve(await getReferrerRecoveryReserve());
    } catch (error) {
      console.error("[admin] referrer reserve load failed", error);
    }
  };
  await revenueLoad();
}
      if (active === "users") {
        try {
const userRows = (await getUsersPage("", "", 1, 1000)).map(mapUserForDisplay);
  setUserPageRows(userRows);
  setUserTotal(userRows.length);
        } catch {
          setUserPageRows([]);
          setUserTotal(0);
        }
      }
      if (failures.length)
        setError(
          `${failures.length} data source${failures.length > 1 ? "s" : ""} could not be loaded. Other modules remain available.`,
        );
      const badgeTables = [
        "deposits",
        "withdrawals",
        "fraud_flags",
        "support_tickets",
      ];
      const badgeResults = await Promise.allSettled(
        badgeTables.map(
          async (table) =>
            [
              table,
              await queryCount(table, {
                status:
                  table === "fraud_flags"
                    ? "open"
                    : table === "support_tickets"
                      ? "open"
                      : "pending",
              }),
            ] as const,
        ),
      );
      const nextCounts: Record<string, number> = {};
      for (const result of badgeResults)
        if (result.status === "fulfilled")
          nextCounts[result.value[0]] = result.value[1];
      setCounts(nextCounts);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Admin data could not be loaded.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [active, navigate, page, query]);
  useEffect(() => {
    if (location.pathname === "/admin/login") return;
    void load();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        adminIdentity.current = null;
        setAuthorization("unauthorized");
        setLoading(false);
        navigate({ to: "/admin/login", replace: true });
      } else if (event === "SIGNED_IN" && !adminIdentity.current) {
        void load();
      }
    });
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel("admin-live-queues")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "deposits" },
          () => void load(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "withdrawals" },
          () => void load(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "fraud_flags" },
          () => void load(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "support_tickets" },
          () => void load(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "plans" },
          () => void load(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "ads" },
          () => void load(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
          () => void load(),
        )
        .subscribe();
    } catch {
      channel = null;
    }
    return () => {
      authListener.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [load, location.pathname, navigate]);
  const currentTable = tableFor[active];
  const currentRows = active === "users" ? userPageRows : currentTable ? (rows[currentTable] ?? []) : [];
  const userCounts = useMemo<UserCounts | undefined>(() => {
    if (active !== "users") return undefined;
    return currentRows.reduce<UserCounts>((next, row) => {
      const classification = classifyUser(row);
      next.all += 1;
      if (classification.system) return next;
      if (classification.paid) {
        next.paid += 1;
        if (classification.plan) next[classification.plan] += 1;
      } else {
        next.unpaid += 1;
      }
      return next;
    }, { all: 0, paid: 0, unpaid: 0, starter: 0, growth: 0, pro: 0 });
  }, [active, currentRows]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const partitionedRows = currentRows.filter((row) => {
      if (active === "users") {
        const classification = classifyUser(row);
        if (userPartition === "all") return true;
        if (userPartition === "paid") return classification.paid;
        if (userPartition === "unpaid") return !classification.paid;
        return classification.plan === userPartition;
      }
      if (active === "tasks") {
        const status = String(row.status ?? "").toLowerCase();
        return adsFilter === "all" || status === adsFilter;
      }
      if (active !== "deposits" && active !== "withdrawals") return true;
      const status = String(row.status ?? "").toLowerCase();
      return statusPartition === "approved"
        ? status === "approved" || (active === "withdrawals" && status === "paid")
        : status === statusPartition;
    });
    return partitionedRows
      .filter((row) => {
        const searchable = active === "users" ? userSearchText(row) : JSON.stringify(row).toLowerCase();
        return !normalizedQuery || searchable.includes(normalizedQuery);
      })
      .sort((a, b) => {
        const aTime = Date.parse(String(a.created_at ?? ""));
        const bTime = Date.parse(String(b.created_at ?? ""));
        return (Number.isFinite(aTime) ? aTime : Number.MAX_SAFE_INTEGER) -
          (Number.isFinite(bTime) ? bTime : Number.MAX_SAFE_INTEGER);
      });
  }, [active, adsFilter, currentRows, query, statusPartition, userPartition]);
  const metrics = useMemo(
    () => [
      { label: "Total users", value: Number(overview.total_users ?? 0) },
      { label: "Active users", value: Number(overview.active_users ?? 0) },
      { label: "All-time total sales", value: Number(overview.gross_plan_sales ?? 0) },
      { label: "Today’s plan sales", value: Number(overview.today_plan_sales ?? 0) },
      { label: "All-time referral commission", value: Number(overview.total_referral_commissions ?? 0) },
      { label: "All-time withdrawals paid", value: Number(overview.total_withdrawals_paid ?? 0) },
      { label: "Tracked cash retained", value: Number(overview.tracked_cash_retained ?? 0) },
      { label: "Rewards issued", value: Number(overview.total_rewards_issued ?? 0) },
      { label: "Remaining reserves", value: Number(overview.total_remaining_user_reward_reserves ?? 0) },
  { label: "Recovery fund collected", value: Number(overview.total_recovery_fund_collected ?? 0) },
  { label: "Recovery fund remaining", value: Number(overview.remaining_recovery_fund ?? 0) },
  { label: "Ad budget recovered", value: Number(overview.total_ad_budget_recovered ?? 0) },
  { label: "Pending support", value: Number(overview.pending_support_tickets ?? 0) },
      { label: "Risk alerts", value: Number(overview.risk_alerts ?? 0) },
    ],
    [overview],
  );
  async function openReceipt(row: AdminRow) {
    const path = typeof row.proof_url === "string" ? row.proof_url.trim() : "";
    if (!path) {
      setReceipt({
        url: null,
        state: row.status === "approved" ? "expired" : "unavailable",
      });
      return;
    }
    setReceipt({ url: null, state: "loading" });
    const { data, error: signedUrlError } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 300);
    if (signedUrlError || !data?.signedUrl) {
      setReceipt({
        url: null,
        state: row.status === "approved" ? "expired" : "unavailable",
      });
      return;
    }
    setReceipt({ url: data.signedUrl, state: "ready" });
  }

  function setStatus(row: AdminRow, status: string) {
    if (!row.id || !currentTable) return;
    setStatusConfirm({ row, status });
    setRejectionReason("");
  }
  async function confirmBalanceAdjustment() {
    if (!balanceTarget?.id || actionBusy) return;
    const parsedAmount = Number(balanceAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("Enter an amount greater than 0.");
      return;
    }
    if (!balanceReason.trim()) {
      toast.error("A reason is required.");
      return;
    }
    setActionBusy(true);
    try {
      await adjustLedger(String(balanceTarget.id), balanceMode === "add" ? parsedAmount : -parsedAmount, balanceReason.trim());
      toast.success(`${balanceMode === "add" ? "Added" : "Deducted"} PKR ${parsedAmount.toLocaleString()} successfully.`);
      setBalanceTarget(null);
      setBalanceAmount("");
      setBalanceReason("");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to adjust this balance.");
    } finally {
      setActionBusy(false);
    }
  }
  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  const managementTable = currentTable && ["plans", "ads", "deposit_methods", "withdrawal_methods"].includes(currentTable);
  async function saveEditedRow(changes: AdminRow) {
    if (!editingRow?.id || !currentTable) return;
    setActionBusy(true);
  try {
    if (currentTable === "withdrawal_methods") {
      const minimum = Number(changes.min_withdrawal_pkr);
      const maximum = Number(changes.max_withdrawal_pkr);
      if (!Number.isFinite(minimum) || minimum <= 0 || !Number.isFinite(maximum) || maximum <= minimum) throw new Error("Minimum must be greater than 0 and maximum must be greater than minimum.");
    }
    await saveManagementRow(currentTable, String(editingRow.id), changes);
      toast.success("Record updated successfully.");
      setEditingRow(null);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to update this item.");
    } finally { setActionBusy(false); }
  }
  async function confirmDelete() {
    if (!deleteTarget?.id || !currentTable) return;
    setActionBusy(true);
    try {
      const result = await deleteOrArchive(currentTable, String(deleteTarget.id));
      toast.success(result.mode === "archived" ? "Record archived to preserve history." : "Record deleted successfully.");
      setDeleteTarget(null);
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to delete this item.");
    } finally { setActionBusy(false); }
  }
  async function submitComplaintReply() {
    if (!replyTarget?.id || actionBusy) return;
    setActionBusy(true);
    try {
      const nextStatus = replyTarget.status === "open" ? "in_progress" : String(replyTarget.status) as "open" | "in_progress" | "resolved" | "closed";
      await replySupportTicket(String(replyTarget.id), nextStatus, replyText);
      toast.success("Complaint updated successfully.");
      setReplyTarget(null);
      setReplyText("");
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to update complaint.");
    } finally {
      setActionBusy(false);
    }
  }

  async function confirmStatusChange() {
    if (!statusConfirm || !currentTable || actionBusy) return;
    setActionBusy(true);
    const row = statusConfirm.row;
    const status = statusConfirm.status;
    try {
      if (active === "users") {
        await setUserStatus(String(row.id), status as "active" | "suspended" | "restricted");
      } else if (
        currentTable === "withdrawals" &&
        ["approved", "processing", "paid", "rejected"].includes(status)
      )
        await reviewWithdrawal(
          String(row.id),
          status as "approved" | "processing" | "paid" | "rejected",
        );
      else if (
        currentTable === "deposits" &&
        (status === "approved" || status === "rejected")
      ) {
        if (status === "rejected" && !rejectionReason.trim())
          throw new Error("Enter a rejection reason.");
        await approveDeposit(
          String(row.id),
          status,
          rejectionReason.trim() || undefined,
        );
      } else if (row.status !== undefined && row.status !== null) {
        await transitionRow(
          currentTable,
          String(row.id),
          String(row.status),
          status,
          `admin_${status}`,
        );
      } else {
        throw new Error("This record does not support status changes.");
      }
      toast.success("Status updated and audit logged");
      setStatusConfirm(null);
      setRejectionReason("");
      await load();
    } catch (cause) {
      console.error("[v0] Admin status action failed", {
        message: cause instanceof Error ? cause.message : String(cause),
        cause,
        depositId: row.id,
        table: currentTable,
        status,
      });
      toast.error(cause instanceof Error ? cause.message : "Unable to complete this action. Please try again.");
    } finally {
      setActionBusy(false);
    }
  }
  if (location.pathname === "/admin/login") return <Outlet />;
  if (loading || authorization === "checking") return <LoadingScreen label="Authenticating" />;
  if (authorization === "unauthorized")
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">Unauthorized</h1>
        <p className="max-w-sm text-sm text-muted-foreground">This account is not authorized to access the admin workspace.</p>
        <Button variant="outline" onClick={() => navigate({ to: "/admin/login", replace: true })}>Return to admin sign in</Button>
      </div>
    );
  return (
    <div className="admin-shell min-h-screen text-foreground">
      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-30 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
          <button className="absolute inset-0 bg-foreground/30" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />
          <aside className="admin-sidebar relative flex h-full w-[min(18rem,85vw)] flex-col overflow-y-auto border-r p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
  <Link to="/" className="flex items-center gap-2 text-lg font-bold" onClick={() => setMobileMenuOpen(false)}>
  <BrandLogo compact className="max-w-[11.5rem] rounded bg-white/95 p-1" />
  <span className="sr-only">AdverX Admin</span>
  </Link>
              <Button variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)}><X /></Button>
            </div>
            <p className="mt-8 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Operations</p>
            <nav className="mt-3 flex flex-col gap-1">
              {menu.map(([key, label, Icon]) => (
                <button key={key} data-active={active === key} className="admin-nav-item flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-all" onClick={() => { setActive(key); setQuery(""); setPage(1); setSelectedUser(null); setMobileMenuOpen(false); }}>
                  <Icon className="size-4" />
                  <span className="min-w-0 flex-1">{label}</span>
                  {key === "deposits" && counts.deposits ? <Badge className="ml-auto">{counts.deposits}</Badge> : null}
                  {key === "withdrawals" && counts.withdrawals ? <Badge className="ml-auto">{counts.withdrawals}</Badge> : null}
                  {active === key ? <ChevronRight className="ml-auto size-4" /> : null}
                </button>
              ))}
            </nav>
          </aside>
        </div>
      ) : null}
      <aside className="admin-sidebar fixed inset-y-0 hidden w-64 overflow-y-auto border-r p-5 lg:block">
  <Link to="/" className="flex items-center gap-2 text-lg font-bold">
  <BrandLogo compact className="max-w-[11.5rem] rounded bg-white/95 p-1" />
  <span className="sr-only">AdverX Admin</span>
  </Link>
        <p className="mt-8 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Operations
        </p>
        <nav className="mt-4 space-y-1.5">
          {menu.map(([key, label, Icon]) => (
            <button
              key={key}
              className="admin-nav-item flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-all" data-active={active === key}
              onClick={() => {
                setActive(key);
                setQuery("");
                setPage(1);
                setSelectedUser(null);
              }}
            >
              <Icon className="size-4" />
              {label}
              {key === "deposits" && counts.deposits ? (
                <Badge className="ml-auto">{counts.deposits}</Badge>
              ) : null}
              {key === "withdrawals" && counts.withdrawals ? (
                <Badge className="ml-auto">{counts.withdrawals}</Badge>
              ) : null}
              {active === key ? (
                <ChevronRight className="ml-auto size-4" />
              ) : null}
            </button>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 overflow-x-hidden lg:pl-64">
        <header className="sticky top-0 z-20 flex min-w-0 items-center justify-between gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur sm:px-5 sm:py-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button className="shrink-0 lg:hidden" variant="outline" size="icon" aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)}><MenuIcon /></Button>
            <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Admin panel
            </p>
            <h1 className="mt-1 truncate text-lg font-semibold sm:text-xl">
              {menu.find(([key]) => key === active)?.[1]}
            </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load()}
              disabled={refreshing}
            >
              <RefreshCw className={`size-4 sm:mr-2 ${refreshing ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Link
              to="/profile"
              aria-label="Open admin profile and user account"
              className="rounded-full ring-offset-background transition-shadow hover:ring-2 hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {adminName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        <div className="admin-page-content morphic-expand min-w-0 space-y-5 p-4 sm:p-5 lg:space-y-6 lg:p-8">
          {error ? (
            <Card className="border-destructive">
              <CardContent className="flex items-center justify-between gap-4 p-4 text-sm">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void load()}
                  disabled={refreshing}
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : null}
          {detailUserId ? (
            <UserDetailPage data={detailData} loading={detailLoading} onBack={closeUserDetails} onLoginAsUser={(userId) => { void (async () => {
              try {
                const tab = window.open("about:blank", "_blank");
                if (!tab) throw new Error("Please allow pop-ups for AdverX.");
                const { data, error } = await supabase.functions.invoke("admin-impersonate", { body: { user_id: userId } });
                if (error || !data?.action_link) { tab.close(); throw new Error(error?.message || "Unable to start user session."); }
                tab.location.href = data.action_link;
              } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Unable to login as user."); }
            })(); }} />
          ) : active === "overview" ? (
            <Overview metrics={metrics} rows={rows} reserveSummary={reserveSummary} />
          ) : active === "settings" ? (
            <HomepageHeroSettings />
          ) : active === "support" ? (
            <SupportTicketPanel admin />
          ) : active === "revenue" ? (
            <RevenueDashboard summary={profitSummary} overview={overview} ledger={profitLedger} plans={revenuePlans} referrerRecoveryReserve={referrerRecoveryReserve} onRefresh={load} />
          ) : (
            <ModuleTable
              active={active}
              rows={filtered}
              totalRecords={active === "users" ? userTotal : undefined}
              query={query}
              setQuery={(value) => {
                setQuery(value);
                setPage(1);
              }}
              page={page}
              setPage={setPage}
              selectedUser={selectedUser}
              setSelectedUser={setSelectedUser}
              actions={statusActions[active] ?? []}
              statusPartition={statusPartition}
              userPartition={userPartition}
              userCounts={userCounts}
              onUserPartition={(value) => {
                setUserPartition(value);
                setPage(1);
              }}
              adsFilter={adsFilter}
              onAdsFilter={(value) => {
                setAdsFilter(value);
                setPage(1);
              }}
              {...(active === "tasks" ? {
                adsCounts: {
                  active: currentRows.filter((row) => String(row.status ?? "").toLowerCase() === "active").length,
                  archived: currentRows.filter((row) => String(row.status ?? "").toLowerCase() === "archived").length,
                  all: currentRows.length,
                },
              } : {})}
              onStatusPartition={(value) => {
                setStatusPartition(value);
                setPage(1);
              }}
              {...(active === "deposits" || active === "withdrawals" ? {
                statusCounts: {
                  pending: currentRows.filter((row) => row.status === "pending").length,
                  approved: currentRows.filter((row) => row.status === "approved" || (active === "withdrawals" && row.status === "paid")).length,
                  rejected: currentRows.filter((row) => row.status === "rejected").length,
                },
              } : {})}
              onStatus={setStatus}
              onAdjustBalance={(row) => {
                setBalanceTarget(row);
                setBalanceMode("add");
                setBalanceAmount("");
                setBalanceReason("");
              }}
              onReply={(row) => { setReplyTarget(row); setReplyText(String(row.admin_reply ?? "")); }}
              createOpen={createOpen}
              setCreateOpen={setCreateOpen}
              onCreated={() => {
                setCreateOpen(false);
                void load();
              }}
              onReceipt={openReceipt}
              managementTable={Boolean(managementTable)}
              onEdit={setEditingRow}
              onDelete={setDeleteTarget}
              onUserDetails={openUserDetails}
            />
          )}
          <Dialog
            open={Boolean(receipt)}
            onOpenChange={(open) => !open && setReceipt(null)}
          >
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Payment receipt</DialogTitle>
                <DialogDescription>
                  {receipt?.state === "expired"
                    ? "Receipt image expired"
                    : receipt?.state === "unavailable"
                      ? "Receipt unavailable"
                      : receipt?.state === "loading"
                        ? "Loading receipt…"
                        : "Secure preview"}
                </DialogDescription>
              </DialogHeader>
              {receipt?.state === "ready" && receipt.url ? (
                <img
                  src={receipt.url}
                  alt="Payment receipt"
                  className="max-h-[65vh] w-full rounded-lg object-contain"
                />
              ) : receipt?.state === "loading" ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-lg border p-10 text-sm text-muted-foreground">
                  <LoadingIndicator size="md" label="Loading receipt" />
                  <span>Secure preview</span>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                  {receipt?.state === "expired"
                    ? "Receipt image expired"
                    : "Receipt unavailable"}
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog
            open={Boolean(balanceTarget)}
            onOpenChange={(open) => {
              if (!open && !actionBusy) {
                setBalanceTarget(null);
                setBalanceAmount("");
                setBalanceReason("");
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust user balance</DialogTitle>
                <DialogDescription>
                  {balanceMode === "add" ? "Add funds to" : "Deduct funds from"} {String(balanceTarget?.full_name ?? balanceTarget?.username ?? balanceTarget?.email ?? "this user")}.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                  <p className="font-medium">{String(balanceTarget?.full_name ?? "User")}</p>
                  <p className="text-muted-foreground">{String(balanceTarget?.username ?? balanceTarget?.email ?? "")}</p>
                  <p className="mt-2">Current available balance: <strong>PKR {Number(balanceTarget?.available_balance ?? balanceTarget?.balance ?? balanceTarget?.wallet_balance ?? 0).toLocaleString()}</strong></p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant={balanceMode === "add" ? "default" : "outline"} onClick={() => setBalanceMode("add")}>Add balance</Button>
                  <Button type="button" variant={balanceMode === "deduct" ? "default" : "outline"} onClick={() => setBalanceMode("deduct")}>Deduct balance</Button>
                </div>
                <label className="grid gap-2 text-sm font-medium" htmlFor="balance-amount">Amount (PKR)
                  <Input id="balance-amount" type="number" min="0.01" step="0.01" value={balanceAmount} onChange={(event) => setBalanceAmount(event.target.value)} placeholder="500" />
                </label>
                <label className="grid gap-2 text-sm font-medium" htmlFor="balance-reason">Reason / note
                  <textarea id="balance-reason" required className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm" value={balanceReason} onChange={(event) => setBalanceReason(event.target.value)} placeholder="Promotional credit or manual correction" />
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" disabled={actionBusy} onClick={() => setBalanceTarget(null)}>Cancel</Button>
                <Button disabled={actionBusy} onClick={() => void confirmBalanceAdjustment()}>{actionBusy ? <LoadingButtonContent label="Processing" /> : "Confirm adjustment"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog
            open={Boolean(statusConfirm)}
            onOpenChange={(open) => !open && setStatusConfirm(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {statusConfirm?.status === "archived"
                    ? "Archive ad?"
                    : statusConfirm?.status === "active" && active === "tasks"
                      ? "Restore ad?"
                      : "Confirm status change"}
                </DialogTitle>
                <DialogDescription>
                  {statusConfirm?.status === "archived"
                    ? "This ad will be archived to preserve its history. It will remain available in the Archived tab."
                    : statusConfirm?.status === "active" && active === "tasks"
                      ? "Restore this archived ad so it is active and available to users again."
                      : "Update this record through the admin workflow."}
                </DialogDescription>
              </DialogHeader>
              {statusConfirm?.status === "rejected" ? (
                <label className="grid gap-2 text-sm font-medium">
                  Rejection reason
                  <textarea
                    className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                  />
                </label>
              ) : null}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setStatusConfirm(null)}
                >
                  Cancel
                </Button>
                <Button disabled={actionBusy} onClick={() => void confirmStatusChange()}>
                  {actionBusy ? <LoadingButtonContent label="Confirming" /> : "Confirm"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={Boolean(replyTarget)} onOpenChange={(open) => !open && setReplyTarget(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Manage complaint</DialogTitle>
                <DialogDescription>Reply to the user and move this complaint through its support workflow.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <p className="text-sm font-medium">{String(replyTarget?.subject ?? "Support complaint")}</p>
                <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">{String(replyTarget?.message ?? "")}</p>
                <textarea className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm" placeholder="Write an admin reply" value={replyText} onChange={(event) => setReplyText(event.target.value)} />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReplyTarget(null)}>Cancel</Button>
                <Button disabled={actionBusy} onClick={() => void submitComplaintReply()}>{actionBusy ? <LoadingButtonContent label="Saving" /> : "Save reply"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <ManagementEditDialog
            row={editingRow}
            table={currentTable ?? ""}
            busy={actionBusy}
            onOpenChange={(open) => !open && setEditingRow(null)}
            onSave={saveEditedRow}
          />
          <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete or archive record?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this item? Records with history are archived automatically instead of being permanently deleted.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
                <Button variant="destructive" disabled={actionBusy} onClick={() => void confirmDelete()}>
                  {actionBusy ? "Working…" : "Delete"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}

function RevenueDashboard({
  summary,
  overview,
  ledger,
  plans,
  referrerRecoveryReserve,
  onRefresh,
}: {
  summary: AdminRow;
  overview: Record<string, number>;
  ledger: AdminRow[];
  plans: AdminRow[];
  referrerRecoveryReserve: number;
  onRefresh: () => Promise<void>;
}) {
  const metric = (value: unknown) =>
    value === undefined || value === null ? "—" : Number(value).toLocaleString();
  const cards: Array<[string, unknown]> = [
    ["Platform Profit", summary.platform_profit ?? summary.total_admin_profit],
    ["Today", summary.today_admin_earnings ?? summary.today_profit],
    ["This month", summary.month_profit],
    ["Available Withdrawable Balance", summary.available_balance],
    ["Unassigned Referral", summary.unassigned_referral ?? summary.total_unassigned_referral],
    ["Unallocated Recovery", summary.unallocated_recovery],
    ["Retained Reward Budget", summary.retained_reward_budget],
    ["Referrer Recovery Reserve", referrerRecoveryReserve],
    ["Admin Own Balance", summary.admin_own_balance],
  ];
  const cardDescription = (label: string) => {
    if (label === "Unassigned Referral") return "Referral commission from a purchase where no eligible referrer existed. This amount is automatically assigned to Admin.";
    if (label === "Unallocated Recovery") return "Recovery allocation from purchases where no eligible referrer existed. Normally this amount would go to the eligible referrer's Recovery Reserve; without a referrer, it remains in this separate platform-use fund.";
    if (label === "Referrer Recovery Reserve") return "Recovery reserves belonging to eligible referrers and supporting their future ad earning capacity.";
    if (label === "Available Withdrawable Balance") return "Admin/platform balance currently available for withdrawal.";
    if (label === "Admin Own Balance") return "Admin-owned balance shown separately from platform profit.";
    return undefined;
  };
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-2xl font-semibold">Platform Wallet</h2>
        <p className="mt-1 text-sm text-muted-foreground">Accounting categories are kept separate. Unassigned Referral is available to the admin/platform under existing accounting logic, but is not Platform Profit.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, key]) => <Card key={label}><CardContent className="flex h-full flex-col p-5"><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>{label === "Unassigned Referral" ? <span className="cursor-help text-muted-foreground" title="This is the referral allocation, not Platform Profit." aria-label="About Unassigned Referral">ⓘ</span> : null}</div><p className="mt-2 text-2xl font-semibold tabular-nums">{metric(key)}</p><p className="mt-1 text-xs text-muted-foreground">PKR</p>{label === "Unallocated Recovery" ? <Badge variant="outline" className="mt-3 w-fit border-destructive/30 text-destructive">NOT WITHDRAWABLE</Badge> : null}{label === "Referrer Recovery Reserve" ? <Badge variant="outline" className="mt-3 w-fit border-primary/30 text-primary">Not Admin Funds</Badge> : null}{cardDescription(label) ? <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{cardDescription(label)}</p> : null}{label === "Unallocated Recovery" ? <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Used only for campaigns, promotions, incentives and approved platform expenses.</p> : null}</CardContent></Card>)}
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Platform Wallet Activity</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each entry identifies its accounting category and source. Historical rows are not reclassified automatically.
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[900px] table-fixed text-sm">
            <colgroup>
              <col className="w-[17%]" />
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[17%]" />
              <col className="w-[12%]" />
              <col className="w-[26%]" />
            </colgroup>
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="p-4 font-medium">Date</th>
                <th scope="col" className="p-4 font-medium">User</th>
                <th scope="col" className="p-4 font-medium">Plan</th>
                <th scope="col" className="p-4 font-medium">Category</th>
                <th scope="col" className="p-4 text-right font-medium">Amount</th>
                <th scope="col" className="p-4 font-medium">Source / Reason</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length ? ledger.map((row, index) => {
                const purchaseId = String(row.deposit_id ?? row.purchase_id ?? row.id ?? "—");
                const category = String(row.category ?? row.status ?? "—");
                const categoryLabel = category.replaceAll("_", " ");
                return (
                  <tr key={String(row.id ?? index)} className="border-b align-middle last:border-0 hover:bg-muted/30">
                    <td className="p-4 whitespace-nowrap text-muted-foreground">{formatValue(row.created_at)}</td>
                    <td className="max-w-0 p-4"><span className="block truncate" title={String(row.user_display ?? "User")}>{formatValue(row.user_display ?? "User")}</span></td>
                    <td className="max-w-0 p-4"><span className="block truncate" title={String(row.plan_name ?? row.plan_id ?? "—")}>{formatValue(row.plan_name ?? row.plan_id)}</span></td>
                    <td className="p-4"><Badge variant="outline" className="whitespace-nowrap border-primary/30 bg-primary/5 capitalize">{categoryLabel}</Badge></td>
                    <td className="p-4 text-right font-medium tabular-nums whitespace-nowrap">{formatValue(row.amount ?? row.profit_amount ?? row.admin_profit)} PKR</td>
                    <td className="max-w-0 p-4"><span className="block truncate text-muted-foreground" title={String(row.source ?? "No eligible referrer")}>{category.toLowerCase().includes("unassigned") ? "No eligible referrer" : formatValue(row.source)}</span></td>
                  </tr>
                );
              }) : <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No accounting ledger entries available.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <RecoveryFundPanel remaining={Number(summary.unallocated_recovery ?? 0)} onRefresh={onRefresh} />
    </div>
  );
}

function RecoveryFundPanel({ remaining, onRefresh }: { remaining: number; onRefresh: () => Promise<void> }) {
  const [activity, setActivity] = useState<AdminRow[]>([]);
  const [amount, setAmount] = useState("");
  const [usageType, setUsageType] = useState("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const rows = await getRecoveryFundActivity();
      setActivity(rows);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load Unallocated Recovery activity.");
    }
  };
  useEffect(() => { void load(); }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0 || !usageType || !reason.trim()) {
      setError("Enter a valid amount, purpose, and reason.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await useRecoveryFund({ amount: value, usageType, targetUserId: null, reason, reference });
      setAmount(""); setReason(""); setReference("");
      await Promise.all([load(), onRefresh()]);
      toast.success(`Unallocated Recovery used: ${value.toLocaleString()} PKR. Remaining balance: ${Number(result.balance_after ?? 0).toLocaleString()} PKR.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to use Unallocated Recovery.");
    } finally { setBusy(false); }
  }
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
      <Card>
        <CardHeader><CardTitle>Use Unallocated Recovery</CardTitle><p className="text-sm text-muted-foreground">Use this separate non-withdrawable fund for campaigns, promotions, incentives or approved platform expenses.</p></CardHeader>
        <CardContent>
            <form className="grid gap-4" onSubmit={submit}>
            <div className="grid gap-3 rounded-lg border bg-muted/30 p-4 text-sm sm:grid-cols-3">
              <div><p className="text-muted-foreground">Current Unallocated Recovery</p><p className="mt-1 font-semibold tabular-nums">{remaining.toLocaleString()} PKR</p></div>
              <div><p className="text-muted-foreground">Amount to use</p><p className="mt-1 font-semibold tabular-nums">{amount ? `${Number(amount).toLocaleString()} PKR` : "—"}</p></div>
              <div><p className="text-muted-foreground">Balance after</p><p className="mt-1 font-semibold text-muted-foreground">Confirmed by database after submit</p></div>
            </div>
            <label className="grid gap-2 text-sm font-medium">Amount (PKR)<Input type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} required /></label>
            <label className="grid gap-2 text-sm font-medium" htmlFor="recovery-purpose">Purpose<select id="recovery-purpose" className="h-10 rounded-md border bg-background px-3 py-2 text-sm font-normal" value={usageType} onChange={(event) => setUsageType(event.target.value)} required><option value="">Select purpose</option><option value="Campaign">Campaign</option><option value="Promotion">Promotion</option><option value="Platform Incentive">Platform Incentive</option><option value="Approved Platform Expense">Approved Platform Expense</option><option value="Platform Recovery">Platform Recovery</option><option value="Other">Other</option></select></label>
            <label className="grid gap-2 text-sm font-medium">Reason / Note<textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm font-normal" value={reason} onChange={(event) => setReason(event.target.value)} required /></label>
            <label className="grid gap-2 text-sm font-medium">Reference (optional)<Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ticket, incident, or internal reference" /></label>
            {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
            <Button type="submit" disabled={busy}>{busy ? "Recording…" : "Use Unallocated Recovery"}</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Unallocated Recovery Activity</CardTitle><p className="text-sm text-muted-foreground">Credits come from purchases with no eligible referrer; debits represent approved platform use.</p></CardHeader>
        <CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[820px] table-fixed text-sm"><colgroup><col className="w-[17%]" /><col className="w-[13%]" /><col className="w-[14%]" /><col className="w-[24%]" /><col className="w-[16%]" /><col className="w-[16%]" /></colgroup><thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th scope="col" className="p-4">Date</th><th scope="col" className="p-4">Type</th><th scope="col" className="p-4 text-right">Amount</th><th scope="col" className="p-4">Purpose / Reason</th><th scope="col" className="p-4">Reference</th><th scope="col" className="p-4 text-right">Balance After</th></tr></thead><tbody>{activity.length ? activity.map((row) => { const entryType = String(row.entry_type ?? row.usage_type ?? "").toLowerCase(); const amountPkr = Number(row.amount_pkr ?? row.amount ?? 0); const signedAmount = entryType === "debit" ? -Math.abs(amountPkr) : entryType === "credit" || entryType === "reversal" ? Math.abs(amountPkr) : amountPkr; return <tr className="border-b last:border-0" key={String(row.id)}><td className="p-4 whitespace-nowrap text-muted-foreground">{formatValue(row.created_at)}</td><td className="p-4">{formatValue(row.entry_type ?? row.usage_type)}</td><td className="p-4 text-right tabular-nums whitespace-nowrap">{signedAmount > 0 ? "+" : ""}{signedAmount.toLocaleString()} PKR</td><td className="max-w-0 p-4"><span className="block truncate" title={String(row.reason ?? "—")}>{formatValue(row.reason)}</span></td><td className="max-w-0 p-4"><span className="block truncate" title={String(row.reference ?? "—")}>{formatValue(row.reference)}</span></td><td className="p-4 text-right tabular-nums whitespace-nowrap">{row.balance_after === null || row.balance_after === undefined ? "—" : `${formatValue(row.balance_after)} PKR`}</td></tr>; }) : <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">No Unallocated Recovery activity yet.</td></tr>}</tbody></table></CardContent>
      </Card>
    </section>
  );
}

function Overview({
  metrics,
  rows,
  reserveSummary,
}: {
  metrics: Array<{ label: string; value: number }>;
  rows: Record<string, AdminRow[]>;
  reserveSummary: AdminRow[];
}) {
  return (
    <>
      <div>
        <h2 className="text-2xl font-semibold">Financial control center</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live Supabase data with independent query recovery.
        </p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {metric.label}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {metric.value.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>
      {reserveSummary.length ? <Card>
        <CardHeader><CardTitle>User reward reserve summary</CardTitle><p className="text-sm text-muted-foreground">Database-backed reserve usage by plan. Reserves are funded capacity, not guaranteed earnings.</p></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {reserveSummary.map((summary) => <div key={String(summary.plan_name)} className="rounded-lg border p-4"><p className="font-medium">{String(summary.plan_name)}</p><p className="mt-2 text-xs text-muted-foreground">Users {String(summary.total_users)} · Original {String(summary.total_original_reserve)} PKR</p><p className="text-xs text-muted-foreground">Used {String(summary.total_reserve_used)} PKR · Remaining {String(summary.total_reserve_remaining)} PKR</p><p className="mt-1 text-sm font-semibold">Rewards issued {String(summary.total_rewards_issued)} PKR</p></div>)}
        </CardContent>
      </Card> : null}
      <Card>
        <CardHeader>
          <CardTitle>Live operational queues</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [
              "Pending Deposits",
              rows.deposits?.filter((row) => row.status === "pending").length ??
                0,
            ],
            [
              "Pending Withdrawals",
              rows.withdrawals?.filter((row) => row.status === "pending")
                .length ?? 0,
            ],
            [
              "Open fraud flags",
              rows.fraud_flags?.filter((row) => row.status === "open").length ??
                0,
            ],
            [
              "Open support",
              rows.support_tickets?.filter((row) => row.status === "open")
                .length ?? 0,
            ],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-lg border p-4">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
function CreateRecordButton({
  active,
  open,
  onOpenChange,
  onCreated,
}: {
  active: AdminModule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    advertiser: "",
    reward: "",
    duration: "30",
    amount: "",
    targetUserId: "",
    body: "",
    note: "",
    adjustment: "",
    minWithdrawal: "",
    maxWithdrawal: "",
    dailyAds: "",
    adminProfit: "",
    referralCommission: "",
    recoveryFund: "",
  });
  const table = tableFor[active];
  const supported = Boolean(
    table &&
    ["plans", "tasks", "revenue", "notifications", "ledger", "deposit-methods", "withdrawal-methods"].includes(active),
  );
  if (!supported) return null;
  const isPlan = active === "plans";
  const title =
    active === "tasks"
      ? "Create ad task"
      : isPlan
        ? "Create plan"
        : `Create ${active.replaceAll("-", " ")}`;
  const reset = () =>
    setForm({
      name: "",
      advertiser: "",
      reward: "",
      duration: "30",
      amount: "",
      targetUserId: "",
      body: "",
      note: "",
      adjustment: "",
      minWithdrawal: "",
      maxWithdrawal: "",
      dailyAds: "",
      adminProfit: "",
      referralCommission: "",
      recoveryFund: "",
    });
  async function create() {
    const name = form.name.trim();
    try {
      if (active === "ledger") {
        const value = Number(form.adjustment);
        if (
          !form.targetUserId.trim() ||
          !form.note.trim() ||
          !Number.isFinite(value) ||
          value === 0
        )
          throw new Error("User, non-zero amount, and note are required.");
        await adjustLedger(form.targetUserId.trim(), value, form.note.trim());
      } else if (active === "notifications") {
        if (!form.targetUserId.trim() || !name || !form.body.trim())
          throw new Error("Target user, title, and message are required.");
        await dispatchNotification(
          form.targetUserId.trim(),
          name,
          form.body.trim(),
        );
      } else if (active === "tasks") {
        const reward = Number(form.reward);
        const duration = Number(form.duration);
        if (
          !name ||
          !form.advertiser.trim() ||
          !Number.isFinite(reward) ||
          reward <= 0 ||
          !Number.isInteger(duration) ||
          duration <= 0
        )
          throw new Error(
            "Enter a valid title, advertiser, reward, and duration.",
          );
        await insertRow(
          table!,
          {
            title: name,
            advertiser: form.advertiser.trim(),
            reward,
            duration_seconds: duration,
            status: "active",
          },
          "admin_create_tasks",
        );
      } else if (active === "deposit-methods") {
        if (!name || !form.advertiser.trim() || !form.amount.trim()) throw new Error("Method name, account title, and account number are required.");
        await insertRow(table!, { name, account_title: form.advertiser.trim(), account_number: form.amount.trim(), instructions: form.body.trim(), is_active: true, sort_order: 0 }, "admin_create_deposit_method");
      } else if (active === "withdrawal-methods") {
        const minimum = Number(form.minWithdrawal);
        const maximum = Number(form.maxWithdrawal);
        if (!name || !form.advertiser.trim() || !Number.isFinite(minimum) || minimum <= 0 || !Number.isFinite(maximum) || maximum <= minimum) {
          throw new Error("Enter a method name, type, minimum greater than 0, and maximum greater than the minimum.");
        }
        await insertRow(table!, { name, destination_label: form.advertiser.trim(), instructions: form.body.trim(), is_active: true, sort_order: 0, min_withdrawal_pkr: minimum, max_withdrawal_pkr: maximum }, "admin_create_withdrawal_method");
      } else if (active === "plans") {
        const price = Number(form.amount);
        const dailyAds = Number(form.dailyAds);
        const adminProfit = Number(form.adminProfit || 0);
        const referralCommission = Number(form.referralCommission || 0);
        const recoveryFund = Number(form.recoveryFund || 0);
        const rewardReserve = 100 - adminProfit - referralCommission - recoveryFund;
        if (!name || !form.body.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(dailyAds) || dailyAds < 0 || [adminProfit, referralCommission, recoveryFund].some((value) => !Number.isFinite(value) || value < 0 || value > 100) || rewardReserve < 0)
          throw new Error("Enter valid plan details. Allocation percentages must total 100% or less.");
        await insertRow(table!, { name, description: form.body.trim(), price_pkr: price, ads_per_day: dailyAds, admin_profit_pct: adminProfit, referrer_commission_pct: referralCommission, recovery_fund_pct: recoveryFund, status: "active", active: true }, "admin_create_plans");
      } else {
        const value = Number(form.amount);
        if (!name || !Number.isFinite(value) || value <= 0)
          throw new Error("Enter a name and positive amount.");
        await insertRow(
          table!,
          {
            advertiser: name,
            campaign: name,
            amount: value,
            status: "pending",
          },
          `admin_create_${active}`,
        );
      }
      toast.success("Record created successfully");
      reset();
      onCreated();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Create failed");
    }
  }
  return (
    <>
      <Button onClick={() => onOpenChange(true)}>Create record</Button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Enter the record details. This form writes directly to Supabase
              and logs the admin action.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {active !== "ledger" && (
              <label className="grid gap-2 text-sm font-medium">
                {isPlan
                  ? "Plan name"
                  : active === "tasks"
                    ? "Ad title"
                    : "Title"}
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={isPlan ? "Starter" : "Campaign title"}
                />
              </label>
            )}
            {(active === "deposit-methods" || active === "withdrawal-methods") && (
              <>
                <label className="grid gap-2 text-sm font-medium">{active === "deposit-methods" ? "Account title" : "Destination label"}<Input value={form.advertiser} onChange={(e) => setForm({ ...form, advertiser: e.target.value })} /></label>
                {active === "deposit-methods" ? <label className="grid gap-2 text-sm font-medium">Account number / wallet address<Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label> : <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Minimum withdrawal<Input type="number" min="1" value={form.minWithdrawal} onChange={(e) => setForm({ ...form, minWithdrawal: e.target.value })} /></label><label className="grid gap-2 text-sm font-medium">Maximum withdrawal<Input type="number" min="1" value={form.maxWithdrawal} onChange={(e) => setForm({ ...form, maxWithdrawal: e.target.value })} /></label></div>}
                <label className="grid gap-2 text-sm font-medium">Instructions / required fields<textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
              </>
            )}
            {active === "tasks" && (
              <>
                <label className="grid gap-2 text-sm font-medium">
                  Advertiser
                  <Input
                    value={form.advertiser}
                    onChange={(e) =>
                      setForm({ ...form, advertiser: e.target.value })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Reward
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.reward}
                    onChange={(e) =>
                      setForm({ ...form, reward: e.target.value })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Duration seconds
                  <Input
                    type="number"
                    min="1"
                    value={form.duration}
                    onChange={(e) =>
                      setForm({ ...form, duration: e.target.value })
                    }
                  />
                </label>
              </>
            )}
            {isPlan && (
              <>
                <label className="grid gap-2 text-sm font-medium">Description<textarea className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
                <label className="grid gap-2 text-sm font-medium">
                  Price PKR
                  <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  {([["adminProfit", "Admin Profit %"], ["referralCommission", "Referral Commission %"], ["recoveryFund", "Recovery Fund %"]] as const).map(([field, label]) => <label key={field} className="grid gap-2 text-sm font-medium">{label}<Input type="number" min="0" max="100" step="0.01" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></label>)}
                </div>
                <label className="grid gap-2 text-sm font-medium">
                  Daily Ads Limit
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.dailyAds}
                    onChange={(e) =>
                      setForm({ ...form, dailyAds: e.target.value })
                    }
                  />
                </label>
              </>
            )}
            {active === "revenue" && (
              <label className="grid gap-2 text-sm font-medium">
                Amount
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </label>
            )}
            {(active === "notifications" || active === "ledger") && (
              <label className="grid gap-2 text-sm font-medium">
                Target user ID
                <Input
                  value={form.targetUserId}
                  onChange={(e) =>
                    setForm({ ...form, targetUserId: e.target.value })
                  }
                />
              </label>
            )}
            {active === "notifications" && (
              <label className="grid gap-2 text-sm font-medium">
                Message
                <textarea
                  className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </label>
            )}
            {active === "ledger" && (
              <>
                <label className="grid gap-2 text-sm font-medium">
                  Signed adjustment
                  <Input
                    type="number"
                    step="0.01"
                    value={form.adjustment}
                    onChange={(e) =>
                      setForm({ ...form, adjustment: e.target.value })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Audit note
                  <textarea
                    className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </label>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void create()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
function ManagementEditDialog({
  row,
  table,
  busy,
  onOpenChange,
  onSave,
}: {
  row: AdminRow | null;
  table: string;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (changes: AdminRow) => void;
}) {
  const [form, setForm] = useState<AdminRow>({});
  useEffect(() => { setForm(row ? { ...row } : {}); }, [row]);
  const planPrice = Number(form.price_pkr ?? 0);
  const adminProfit = Number(form.admin_profit_pct ?? 0);
  const referralCommission = Number(form.referrer_commission_pct ?? 0);
  const recoveryFund = Number(form.recovery_fund_pct ?? 0);
  const rewardReserve = 100 - adminProfit - referralCommission - recoveryFund;
  const rewardBudget = planPrice * Math.max(0, rewardReserve) / 100;
  const fields = table === "plans"
    ? ["name", "description", "price_pkr", "admin_profit_pct", "referrer_commission_pct", "recovery_fund_pct", "ads_per_day", "active"]
    : table === "ads"
      ? ["title", "description", "destination_url", "duration_seconds", "reward", "reward_enabled", "display_order", "status"]
      : table === "deposit_methods"
        ? ["name", "account_title", "account_number", "instructions", "min_deposit_pkr", "max_deposit_pkr", "sort_order", "is_active"]
        : table === "withdrawal_methods"
          ? ["name", "destination_label", "instructions", "min_withdrawal_pkr", "max_withdrawal_pkr", "sort_order", "is_active"]
          : ["key", "value"];
  return (
    <Dialog open={Boolean(row)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Edit {table.replaceAll("_", " ")}</DialogTitle><DialogDescription>Changes are saved to Supabase and audit logged.</DialogDescription></DialogHeader>
        <div className="grid gap-3">
          {fields.map((field) => {
            const value = form[field];
            const booleanField = typeof value === "boolean" || ["active", "is_active", "reward_enabled", "referral_enabled"].includes(field);
            return <label key={field} className="grid gap-1 text-sm font-medium">{table === "plans" && field === "ads_per_day" ? "Daily Ads Limit" : field.replaceAll("_", " ")}{booleanField ? <select className="h-9 rounded-md border bg-background px-2" value={String(Boolean(value))} onChange={(e) => setForm({ ...form, [field]: e.target.value === "true" })}><option value="true">Active / enabled</option><option value="false">Inactive / disabled</option></select> : <Input type={["price_pkr", "admin_profit_pct", "referrer_commission_pct", "recovery_fund_pct", "base_ad_reward_pkr", "max_ad_reward_pkr", "daily_reward_limit_pkr", "ads_per_day", "duration_seconds", "reward", "display_order", "sort_order", "min_deposit_pkr", "max_deposit_pkr", "min_withdrawal_pkr", "max_withdrawal_pkr"].includes(field) ? "number" : "text"} value={String(value ?? "")} onChange={(e) => setForm({ ...form, [field]: e.target.type === "number" ? Number(e.target.value) : e.target.value })} />}</label>;
          })}
        </div>
        {table === "plans" && (
          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="mb-2 font-medium">Live allocation summary</p>
            <p>Admin profit: {adminProfit}% = Rs. {(planPrice * adminProfit / 100).toFixed(2)}</p>
            <p>Referral commission: {referralCommission}% = Rs. {(planPrice * referralCommission / 100).toFixed(2)}</p>
            <p>Recovery fund: {recoveryFund}% = Rs. {(planPrice * recoveryFund / 100).toFixed(2)}</p>
            <p>Reward reserve: {rewardReserve}% = Rs. {rewardBudget.toFixed(2)}</p>
          </div>
        )}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={busy || (table === "plans" && rewardReserve < 0)} onClick={() => onSave(Object.fromEntries(fields.map((field) => [field, form[field]])))}>{busy ? "Saving…" : "Save changes"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UserDetailPage({ data, loading, onBack, onLoginAsUser }: { data: AdminRow | null; loading: boolean; onBack: () => void; onLoginAsUser?: (userId: string) => void }) {
  if (loading) {
    return <div className="flex min-h-64 items-center justify-center"><LoadingIndicator size="md" label="Loading user details" /></div>;
  }
  if (!data) {
    return <Card><CardContent className="flex flex-col items-center gap-4 p-10 text-center"><p className="font-medium">Unable to load this user.</p><Button variant="outline" onClick={onBack}>Back to users</Button></CardContent></Card>;
  }

  const profile = data.profile as AdminRow;
  const summary = data.summary as AdminRow;
  const plans = (data.plans ?? []) as AdminRow[];
  const deposits = (data.deposits ?? []) as AdminRow[];
  const withdrawals = (data.withdrawals ?? []) as AdminRow[];
  const commissions = (data.commissions ?? []) as AdminRow[];
  const ledger = (data.ledger ?? []) as AdminRow[];
  const displayName = String(profile.full_name ?? profile.username ?? "User");

  const money = (value: unknown) => `PKR ${Number(value ?? 0).toLocaleString()}`;
  const info = [
    ["Full name", profile.full_name],
    ["Username", profile.username],
    ["Public UID", profile.public_uid],
    ["Referral code", profile.referral_code],
    ["Referred by", profile.referred_by],
    ["Status", profile.status],
    ["Role", profile.role],
    ["Verified", profile.verified],
    ["Plan activated", profile.plan_activated_at],
    ["Created at", profile.created_at],
    ["Recovery reserve", profile.recovery_reserve_pkr],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 size-4" />Back to users</Button>
        <Badge variant="outline">{String(profile.status ?? "unknown")}</Badge>
      </div>
      <div>
        <h2 className="text-2xl font-semibold">{displayName}</h2>
        <p className="mt-1 text-sm text-muted-foreground">AdverX user profile and account activity.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["Balance", money(summary.balance)],
          ["Deposits", money(summary.deposits)],
          ["Withdrawals", money(summary.withdrawals)],
          ["Transactions", Number(summary.transactions ?? 0).toLocaleString()],
          ["Total Invest", money(summary.total_invest)],
        ].map(([label, value]) => <Card key={label}><CardContent className="p-5"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Referral commission</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{money(summary.referral_commission)}</p><p className="mt-1 text-xs text-muted-foreground">Completed referral commissions credited to this user.</p></CardContent></Card>
        <Card><CardHeader><CardTitle>Profile information</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2">{info.map(([label, value]) => <div key={label}><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-medium">{formatValue(value)}</p></div>)}</CardContent></Card>
      </section>
      <Card><CardHeader><CardTitle>Plans</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="p-3">Plan</th><th className="p-3 text-right">Purchase</th><th className="p-3 text-right">Reward reserve</th><th className="p-3">Status</th><th className="p-3">Purchased</th></tr></thead><tbody>{plans.length ? plans.map((row) => <tr key={String(row.id)} className="border-b last:border-0"><td className="p-3 font-medium">{formatValue(row.plan_display_name)}</td><td className="p-3 text-right tabular-nums">{money(row.purchase_price_pkr)}</td><td className="p-3 text-right tabular-nums">{money(row.reward_budget_pkr)}</td><td className="p-3">{formatValue(row.status)}</td><td className="p-3">{formatValue(row.purchased_at ?? row.created_at)}</td></tr>) : <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No plan records.</td></tr>}</tbody></table></CardContent></Card>
      <section className="grid gap-5 xl:grid-cols-3">
        {[
          ["Deposits", deposits, ["amount", "status", "method", "transaction_id", "created_at"]],
          ["Withdrawals", withdrawals, ["amount", "status", "method", "fee", "created_at"]],
          ["Referral commissions", commissions, ["amount", "level", "percentage", "source", "status", "created_at"]],
        ].map(([title, items, fields]) => <Card key={String(title)}><CardHeader><CardTitle>{String(title)}</CardTitle></CardHeader><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[520px] text-xs"><thead><tr className="border-b text-left uppercase tracking-wide text-muted-foreground">{(fields as string[]).map((field) => <th key={field} className="p-3 whitespace-nowrap">{field.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{(items as AdminRow[]).slice(0, 10).map((row) => <tr key={String(row.id)} className="border-b last:border-0"><td className="p-3">{formatValue(row[(fields as string[])[0]])}</td>{(fields as string[]).slice(1).map((field) => <td key={field} className="p-3">{formatValue(row[field])}</td>)}</tr>)}{!(items as AdminRow[]).length ? <tr><td colSpan={(fields as string[]).length} className="p-8 text-center text-muted-foreground">No records.</td></tr> : null}</tbody></table></CardContent></Card>)}
      </section>
      <Card><CardHeader><CardTitle>Wallet ledger</CardTitle><p className="text-sm text-muted-foreground">The same ledger entries used for this user's balance.</p></CardHeader><CardContent className="overflow-x-auto p-0"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="p-3">Date</th><th className="p-3">Type</th><th className="p-3 text-right">Amount</th><th className="p-3">Note</th></tr></thead><tbody>{ledger.slice(0, 25).map((row) => <tr key={String(row.id)} className="border-b last:border-0"><td className="p-3 whitespace-nowrap">{formatValue(row.created_at)}</td><td className="p-3">{formatValue(row.entry_type)}</td><td className="p-3 text-right tabular-nums">{money(row.amount)}</td><td className="p-3">{formatValue(row.note)}</td></tr>)}{!ledger.length ? <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No ledger entries.</td></tr> : null}</tbody></table></CardContent></Card>
    </div>
  );
}

function shortId(value: unknown) {
  const text = String(value ?? "");
  return text.length > 14 ? `${text.slice(0, 8)}…${text.slice(-4)}` : text || "—";
}

function actionBadgeClass(value: string) {
  const action = value.toLowerCase();
  if (action.includes("approved") || action.includes("resolved") || action.includes("credited")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (action.includes("sync") || action.includes("submitted") || action.includes("requested")) return "border-sky-200 bg-sky-50 text-sky-700";
  if (action.includes("reject") || action.includes("delete")) return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function prettyJson(value: unknown) {
  if (typeof value === "string") {
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }
  return JSON.stringify(value ?? {}, null, 2);
}

function ModuleTable({
  active,
  rows,
  totalRecords,
  userCounts,
  query,
  setQuery,
  page,
  setPage,
  selectedUser,
  setSelectedUser,
  actions,
  statusPartition,
  userPartition,
  onUserPartition,
  onStatusPartition,
  adsFilter,
  onAdsFilter,
  adsCounts,
  statusCounts,
  onStatus,
  onAdjustBalance,
  onReply,
  createOpen,
  setCreateOpen,
  onCreated,
  onReceipt,
  managementTable,
  onEdit,
  onDelete,
}: {
  active: AdminModule;
  rows: AdminRow[];
  totalRecords: number | undefined;
  query: string;
  setQuery: (value: string) => void;
  page: number;
  setPage: (value: number) => void;
  selectedUser: AdminRow | null;
  setSelectedUser: (row: AdminRow | null) => void;
  actions: string[];
  statusPartition?: "pending" | "approved" | "rejected";
  userPartition?: "all" | "paid" | "unpaid" | "starter" | "growth" | "pro";
  onUserPartition?: (value: "all" | "paid" | "unpaid" | "starter" | "growth" | "pro") => void;
  onStatusPartition?: (value: "pending" | "approved" | "rejected") => void;
  userCounts: { all: number; paid: number; unpaid: number; starter: number; growth: number; pro: number } | undefined;
  adsFilter?: "active" | "archived" | "all";
  onAdsFilter?: (value: "active" | "archived" | "all") => void;
  adsCounts?: { active: number; archived: number; all: number };
  statusCounts?: { pending: number; approved: number; rejected: number };
  onStatus: (row: AdminRow, status: string) => void;
  onAdjustBalance: (row: AdminRow) => void;
  onReply: (row: AdminRow) => void;
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  onCreated: () => void;
  onReceipt: (row: AdminRow) => void;
  managementTable: boolean;
  onEdit: (row: AdminRow) => void;
  onDelete: (row: AdminRow) => void;
  onUserDetails: (userId: string) => void;
}) {
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const visibleRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const [metadataRow, setMetadataRow] = useState<AdminRow | null>(null);
  const rawColumns = [...new Set(rows.flatMap((row) => Object.keys(row)))].filter(
    (column) => !["id", "user_id", "profile_id", "created_by", "replied_by", "public_uid"].includes(column),
  );
  const columns = active === "plans"
  ? [
  ...[
  "name",
  "price_pkr",
  "admin_profit_pct",
  "referrer_commission_pct",
  "recovery_fund_pct",
  "ad_budget_pct",
  "reward_budget_pkr",
  "ads_per_day",
  "status",
  "created_at",
  "description",
  ].filter((column) => rawColumns.includes(column)),
  ...rawColumns.filter(
  (column) =>
  ![
  "name",
  "price_pkr",
  "ads_per_day",
  "status",
  "created_at",
  "description",
  "min_deposit_pkr",
  "daily_ads",
  "ads_per_day",
  "id",
  ].includes(column),
  ),
  ].slice(0, 6)
  : active === "users"
  ? ["user", "plan", "payment", "status", "role"]
  : rawColumns.slice(0, 6);
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <CardHeader className="gap-4 border-b border-slate-200/80 bg-slate-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-1 w-10 rounded-full bg-[#6366f1]" />
        <div>
          <CardTitle>{active.replaceAll("-", " ")}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalRecords ?? rows.length} live records from Supabase.
          </p>
        </div>
        {active === "users" && userCounts && onUserPartition ? (
          <div className="flex w-full gap-2 overflow-x-auto pb-1" role="tablist" aria-label="User filters">
            {(["all", "paid", "unpaid", "starter", "growth", "pro"] as const).map((filter) => (
              <Button key={filter} type="button" size="sm" variant={userPartition === filter ? "default" : "outline"} role="tab" aria-selected={userPartition === filter} onClick={() => onUserPartition(filter)} className="shrink-0 capitalize">
                {filter === "all" ? "All" : `${filter.slice(0, 1).toUpperCase()}${filter.slice(1)}`} ({userCounts[filter]})
              </Button>
            ))}
          </div>
        ) : adsCounts && onAdsFilter ? (
          <div className="flex w-full gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Ads status">
            {(["active", "archived", "all"] as const).map((status) => (
              <Button key={status} type="button" size="sm" variant={adsFilter === status ? "default" : "outline"} role="tab" aria-selected={adsFilter === status} onClick={() => onAdsFilter(status)} className="shrink-0 capitalize">
                {status} ({adsCounts[status]})
              </Button>
            ))}
          </div>
        ) : statusCounts && onStatusPartition ? (
          <div className="flex w-full gap-2 overflow-x-auto pb-1" role="tablist" aria-label={`${active} status`}>
            {(["pending", "approved", "rejected"] as const).map((status) => (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={statusPartition === status ? "default" : "outline"}
                role="tab"
                aria-selected={statusPartition === status}
                onClick={() => onStatusPartition(status)}
                className="shrink-0 capitalize"
              >
                {status} ({statusCounts[status]})
              </Button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Input
            className="sm:max-w-xs"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records"
          />
          <CreateRecordButton
            active={active}
            open={createOpen}
            onOpenChange={setCreateOpen}
            onCreated={onCreated}
          />
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {!rows.length ? (
          <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-indigo-50 text-indigo-700"><Inbox className="size-5" /></div>
            <p className="font-medium text-slate-800">Nothing to review yet</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">Records will appear here as activity is created.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] table-auto text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50">
                <tr className="border-b border-slate-200/80 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {columns.map((column) => (
                    <th className="whitespace-nowrap px-2 py-1.5 text-[11px]" key={column}>
                      {active === "plans" && column === "ads_per_day"
                        ? "Daily Ads Limit"
                        : column.replaceAll("_", " ")}
                    </th>
                  ))}
  {actions.length || managementTable || active === "support" ? (
  <th className="whitespace-nowrap px-2 py-2">Actions</th>

                  ) : null}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, index) => (
                  <tr
                    className={`border-b border-slate-100 transition-colors hover:bg-[#fff8f2] ${index % 2 ? "bg-slate-50/35" : "bg-white/30"}`}
                    key={String(row.id ?? index)}
                    onClick={() => active === "users" && setSelectedUser(row)}
                  >
                    {columns.map((column) => (
                      <td
                        className="max-w-[180px] truncate px-2 py-1.5 align-middle text-xs"
                        key={column}
                      >
                        {active === "audit-logs" && column === "metadata" ? (
                          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-indigo-700 hover:bg-indigo-50" onClick={(event) => { event.stopPropagation(); setMetadataRow(row); }}>
                            <Eye className="size-3.5" /> View details
                          </Button>
                        ) : active === "audit-logs" && ["actor_id", "admin_id", "user_id", "target_id"].includes(column) ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-slate-600" title={String(row[column] ?? "")}>{shortId(row[column])}<button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-indigo-700" aria-label="Copy ID" onClick={(event) => { event.stopPropagation(); void navigator.clipboard?.writeText(String(row[column] ?? "")); }}><Copy className="size-3" /></button></span>
                        ) : active === "audit-logs" && ["action", "event_type"].includes(column) ? (
                          <Badge variant="outline" className={`border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${actionBadgeClass(String(row[column] ?? ""))}`}>{String(row[column] ?? "—").replaceAll("_", " ")}</Badge>
                        ) : <span title={String(row[column] ?? "")}>{active === "tasks" && column !== "created_at" ? String(row[column] ?? "—") : formatValue(row[column])}</span>}
                      </td>
                    ))}
                    {active === "deposits" ? (
                      <td className="whitespace-nowrap px-2 py-1.5 align-middle">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              onReceipt(row);
                            }}
                            disabled={!row.proof_url}
                          >
                            View Receipt
                          </Button>
                          {row.status === "pending" ? (
                            <>
                              <Button
                                size="sm"
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onStatus(row, "approved");
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="bg-rose-600 text-white hover:bg-rose-700"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onStatus(row, "rejected");
                                }}
                              >
                                Reject
                              </Button>
                            </>
                          ) : null}
                          {actions.length ? (
                            <select
                              aria-label={`Change status for ${String(row.full_name ?? row.id ?? "deposit")}`}
                              className="h-9 rounded-md border bg-background px-2 text-sm"
                              value=""
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                event.target.value &&
                                onStatus(row, event.target.value)
                              }
                            >
                              <option value="">Change status</option>
                              {actions.map((action) => (
                                <option key={action} value={action}>
                                  {action}
                                </option>
                              ))}
                            </select>
                          ) : null}
                        </div>
                      </td>
  ) : actions.length || managementTable || active === "support" ? (
                        <td className="whitespace-nowrap px-2 py-2 align-middle">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          {active === "users" ? <><Button size="sm" variant="outline" className="h-9 rounded-full px-4" onClick={(event) => { event.stopPropagation(); onUserDetails(String(row.id)); }}>Details</Button><Button size="sm" variant="outline" className="h-9 rounded-full px-4" onClick={(event) => { event.stopPropagation(); onAdjustBalance(row); }}>Adjust balance</Button></> : null}
                          {managementTable ? <><Button size="sm" variant="outline" className="h-9 rounded-full px-4" onClick={(event) => { event.stopPropagation(); onEdit(row); }}>Edit</Button>{active === "tasks" ? row.status === "archived" ? <Button size="sm" className="h-9 rounded-full bg-emerald-600 px-4 text-white hover:bg-emerald-700" onClick={(event) => { event.stopPropagation(); onStatus(row, "active"); }}>Restore</Button> : <Button size="sm" className="h-9 rounded-full bg-rose-600 px-4 text-white hover:bg-rose-700" onClick={(event) => { event.stopPropagation(); onStatus(row, "archived"); }}>Archive</Button> : <Button size="sm" variant="destructive" className="h-9 rounded-full bg-rose-600 px-4 text-white hover:bg-rose-700" onClick={(event) => { event.stopPropagation(); onDelete(row); }}>Delete</Button>}</> : null}
                          {active === "support" ? <Button size="sm" variant="outline" className="h-9 rounded-full px-4" onClick={(event) => { event.stopPropagation(); onReply(row); }}>Reply / Manage</Button> : null}
                          {actions.length ? <select
                            aria-label={`Change status for ${String(row.full_name ?? row.id ?? "record")}`}
                            className="h-9 shrink-0 appearance-none rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus:ring-2 focus:ring-slate-200"
                            value=""
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              event.target.value &&
                              onStatus(row, event.target.value)
                            }
                          >
                            <option value="">Change status</option>
                            {actions.map((action) => (
                              <option key={action} value={action}>
                                {action}
                              </option>
                            ))}
                          </select> : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {visibleRows.length} of {rows.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                <span className="px-2 py-2 text-sm text-muted-foreground">
                  Page {page} of {pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  onClick={() => setPage(Math.min(pageCount, page + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
        {selectedUser ? (
          <Card className="mt-4">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>User details</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </Button>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {Object.entries(selectedUser).map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs uppercase text-muted-foreground">
                    {key.replaceAll("_", " ")}
                  </p>
                  <p className="text-sm">{formatValue(value)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
        <Dialog open={Boolean(metadataRow)} onOpenChange={(open) => !open && setMetadataRow(null)}>
          <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Sparkles className="size-4 text-indigo-700" /> Audit metadata</DialogTitle>
              <DialogDescription>Structured details captured with this audit event.</DialogDescription>
            </DialogHeader>
            <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-6 text-slate-700">{prettyJson(metadataRow?.metadata)}</pre>
            <DialogFooter><Button variant="outline" onClick={() => setMetadataRow(null)}>Close</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
