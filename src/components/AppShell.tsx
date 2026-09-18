import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  History,
  Home,
  MonitorPlay,
  Users,
  Wallet,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { usePlatform } from "@/lib/platform-store";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/LoadingIndicator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/BrandLogo";
import "@/dashboard-design.css";
import "@/morphic-system.css";

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/ads", label: "Ads", icon: MonitorPlay },
  { to: "/network", label: "Network", icon: Users },
  { to: "/withdraw", label: "Withdraw", icon: Wallet },
  { to: "/history", label: "History", icon: History },
  { to: "/support", label: "Support", icon: LifeBuoy },
];

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

  return (
    <div className="dashboard-shell mx-auto flex min-h-screen w-full max-w-7xl flex-col">
      <header className="dashboard-header sticky top-0 z-20 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/" aria-label="AdverX home" className="shrink-0">
            <BrandLogo compact className="max-w-[10.5rem] sm:max-w-[12rem]" />
          </Link>
          <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="glass-input relative border-0">
            <Link to="/notifications" aria-label="Notifications">
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
              )}
            </Link>
          </Button>
          <Link to="/profile" aria-label="Profile">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground shadow-brand">
                {(user?.fullName ?? "G").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl min-w-0 flex-1 px-4 pb-32 pt-4 sm:px-6 sm:pb-28 lg:px-8">{children}</main>

      <nav className="dashboard-nav fixed bottom-3 left-1/2 z-20 w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 sm:bottom-5 sm:pb-2">
        <ul className="grid grid-cols-6 gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="dashboard-nav-item flex min-h-12 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-[10px] font-medium transition-all duration-200 sm:text-[11px]"
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
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
