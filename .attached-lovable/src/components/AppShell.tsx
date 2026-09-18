import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  History,
  Home,
  MonitorPlay,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { usePlatform } from "@/lib/platform-store";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/ads", label: "Ads", icon: MonitorPlay },
  { to: "/network", label: "Network", icon: Users },
  { to: "/withdraw", label: "Withdraw", icon: Wallet },
  { to: "/history", label: "History", icon: History },
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
  const { state, ready, unreadCount } = usePlatform();
  const navigate = useNavigate();
  const user = state.user;

  useEffect(() => {
    if (ready && requireAuth && !user) navigate({ to: "/auth", replace: true });
  }, [ready, requireAuth, user, navigate]);

  if (!ready || (requireAuth && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-card/90 px-4 py-3 backdrop-blur">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link to="/notifications" aria-label="Notifications">
              <Bell className="size-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
              )}
            </Link>
          </Button>
          <Link to="/profile" aria-label="Profile">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                {(user?.fullName ?? "G").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-lg -translate-x-1/2 border-t border-border bg-card/95 backdrop-blur">
        <ul className="grid grid-cols-5">
          {NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground transition-colors data-[status=active]:text-primary"
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
    <div className="surface p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="num mt-1 text-xl font-semibold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
