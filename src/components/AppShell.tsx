import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Home,
  MonitorPlay,
  Users,
  Wallet,
  LifeBuoy,
  History,
  Menu,
  BadgeCheck,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { usePlatform } from "@/lib/platform-store";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/LoadingIndicator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/BrandLogo";
import "@/dashboard-design.css";
import "@/morphic-system.css";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: Home }],
  },
  {
    label: "Earn & manage",
    items: [
      { to: "/ads", label: "Ad Tasks", icon: MonitorPlay },
      { to: "/plans", label: "Plans", icon: BadgeCheck },
      { to: "/network", label: "Referrals", icon: Users },
    ],
  },
  {
    label: "Finance",
    items: [{ to: "/withdraw", label: "Withdrawals", icon: Wallet }, { to: "/history", label: "Transaction History", icon: History }],
  },
  {
    label: "Support",
    items: [{ to: "/support", label: "Support", icon: LifeBuoy }, { to: "/profile", label: "Profile", icon: BadgeCheck }],
  },
] satisfies Array<{ label: string; items: { to: string; label: string; icon: LucideIcon }[] }>;

export function AppShell({
  title,
  subtitle,
  children,
  requireAuth = true,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  requireAuth?: boolean | undefined;
}) {
  const { state, ready, dataError, unreadCount } = usePlatform();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = state.user;

  useEffect(() => {
    if (ready && requireAuth && !user) navigate({ to: "/auth", replace: true });
  }, [ready, requireAuth, user, navigate]);

  if (requireAuth && !ready) return <LoadingScreen label="Loading your workspace" />;

  if (requireAuth && dataError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-destructive">{dataError}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  if (requireAuth && !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Your session has ended.</p>
        <Button onClick={() => navigate({ to: "/auth", replace: true })}>
          Sign in again
        </Button>
      </div>
    );
  }

  const navigation = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center border-b border-sidebar-border px-6">
        <Link to="/" aria-label="AdverX home" onClick={() => setMobileOpen(false)}><BrandLogo compact className="max-w-[9.5rem]" /></Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{group.label}</p>
            <div className="flex flex-col gap-1">
              {group.items.map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} activeOptions={{ exact: to === "/" }} onClick={() => setMobileOpen(false)} className="app-nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium">
                  <Icon className="size-[18px]" />{label}
                </Link>
              ))}
            </div>
          </div>
        ))}
        {user?.role && ["admin", "super_admin", "moderator"].includes(user.role) ? (
          <div className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Administration</p>
            <Link to="/admin" onClick={() => setMobileOpen(false)} className="app-nav-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium">
              <ShieldCheck className="size-[18px]" />Admin panel
            </Link>
          </div>
        ) : null}
      </div>
      <div className="border-t border-sidebar-border p-4"><div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3"><Avatar className="size-9"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{(user?.fullName ?? "G").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.fullName ?? "Member"}</p><p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p></div></div></div>
    </div>
  );

  return (
    <div className="dashboard-shell flex min-h-screen w-full">
      <aside className="app-sidebar hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">{navigation}</aside>
      {mobileOpen ? <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setMobileOpen(false)} /> : null}
      <aside className={`app-mobile-sidebar fixed inset-y-0 left-0 z-40 w-72 bg-sidebar shadow-xl transition-transform lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>{navigation}<button className="absolute right-4 top-6 rounded-md p-1 text-muted-foreground" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X /></button></aside>
      <div className="min-w-0 flex-1">
        <header className="dashboard-header sticky top-0 z-20 flex h-20 items-center justify-between border-b px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu /></Button><div className="min-w-0"><p className="hidden text-xs font-medium text-muted-foreground sm:block">AdverX workspace</p><h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h1>{subtitle ? <p className="truncate text-xs text-muted-foreground sm:hidden">{subtitle}</p> : null}</div></div>
          <div className="flex items-center gap-2"><Button asChild variant="ghost" size="icon" className="relative"><Link to="/notifications" aria-label="Notifications"><Bell />{unreadCount > 0 ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" /> : null}</Link></Button><Link to="/profile" aria-label="Profile"><Avatar className="size-9"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{(user?.fullName ?? "G").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar></Link></div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] min-w-0 flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="surface p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="num mt-1 text-xl font-semibold">{value}</p>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
