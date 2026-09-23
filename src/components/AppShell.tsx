import { Link, useNavigate } from "@tanstack/react-router";
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(false);
  const [currency, setCurrency] = useState<"PKR" | "USD">(() => {
    if (typeof window === "undefined") return "PKR";
    return window.localStorage.getItem("adverx-display-currency") === "USD" ? "USD" : "PKR";
  });
  const user = state.user;

  useEffect(() => {
    if (!user?.id) return;
    const key = `adverx-whatsapp-channel-prompt:${user.id}`;
    if (window.localStorage.getItem(key) !== "seen") setShowWhatsAppPrompt(true);
  }, [user?.id]);

  const changeCurrency = (next: "PKR" | "USD") => {
    window.localStorage.setItem("adverx-display-currency", next);
    setCurrency(next);
    window.dispatchEvent(new CustomEvent("adverx-currency-change", { detail: next }));
  };

  const dismissWhatsAppPrompt = () => {
    if (!user?.id) return;
    window.localStorage.setItem(`adverx-whatsapp-channel-prompt:${user.id}`, "seen");
    setShowWhatsAppPrompt(false);
  };

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
        <Button onClick={() => navigate({ to: "/auth", replace: true })}>Sign in again</Button>
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
          <div className="flex items-center gap-2">
            <select
              value={currency}
              onChange={(event) => changeCurrency(event.target.value as "PKR" | "USD")}
              aria-label="Display currency"
              className="h-9 rounded-lg border border-border/70 bg-muted/50 px-2.5 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="PKR">PKR — Rs</option>
              <option value="USD">USD — $</option>
            </select>
            <Button asChild variant="ghost" size="icon" className="relative"><Link to="/notifications" aria-label="Notifications"><Bell />{unreadCount > 0 ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" /> : null}</Link></Button>
            <Link to="/profile" aria-label="Profile"><Avatar className="size-9"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{(user?.fullName ?? "G").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar></Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] min-w-0 flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <a href="https://whatsapp.com/channel/0029VbDmSMAGk1Flgs0YeW42" target="_blank" rel="noreferrer" className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-primary/[0.06] px-4 py-3 shadow-sm transition hover:bg-primary/[0.1]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-sm"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current"><path d="M20.52 3.48A11.77 11.77 0 0 0 12.08 0C5.56 0 .26 5.3.26 11.82c0 2.08.54 4.1 1.57 5.88L.16 23.99l6.43-1.68a11.8 11.8 0 0 0 5.48 1.35h.01c6.51 0 11.81-5.3 11.81-11.82 0-3.16-1.23-6.12-3.37-8.36ZM12.08 21.7h-.01a9.85 9.85 0 0 1-5.02-1.37l-.36-.21-3.82 1 1.02-3.72.01-3.72a9.82 9.82 0 1 1 8.43 4.68Zm5.4-7.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.2.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.09 4.5.71.31 1.35.2 1.86.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/></svg></div>
              <div className="min-w-0"><p className="text-sm font-semibold text-foreground">Stay connected with AdverX 📢</p><p className="truncate text-xs text-muted-foreground">Join our official WhatsApp Channel for updates & announcements.</p></div>
            </div>
            <span className="shrink-0 text-xs font-semibold text-primary">Join Channel →</span>
          </a>
          {children}
        </main>
        {showWhatsAppPrompt ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="whatsapp-channel-title" className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-background p-6 shadow-2xl">
              <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-md"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-7 fill-current"><path d="M20.52 3.48A11.77 11.77 0 0 0 12.08 0C5.56 0 .26 5.3.26 11.82c0 2.08.54 4.1 1.57 5.88L.16 23.99l6.43-1.68a11.8 11.8 0 0 0 5.48 1.35h.01c6.51 0 11.81-5.3 11.81-11.82 0-3.16-1.23-6.12-3.37-8.36Zm-8.44 18.22h-.01a9.85 9.85 0 0 1-5.02-1.37l-.36-.21-3.82 1 1.02-3.72-.24-.38a9.82 9.82 0 1 1 8.43 4.68Zm5.4-7.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.09 4.5.71.31 1.26.49 1.69.63.71.23 1.35.2 1.86.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z"/></svg></div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">AdverX Community</p>
              <h2 id="whatsapp-channel-title" className="mt-2 text-2xl font-bold tracking-tight">Stay updated with AdverX 🚀</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Join our official WhatsApp Channel for important announcements, platform updates, offers and community news.</p>
              <a href="https://whatsapp.com/channel/0029VbDmSMAGk1Flgs0YeW42" target="_blank" rel="noreferrer" onClick={dismissWhatsAppPrompt} className="mt-6 flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Join WhatsApp Channel →</a>
              <button type="button" onClick={dismissWhatsAppPrompt} className="mt-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground">Maybe later</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="surface p-4 transition-transform duration-200 hover:-translate-y-0.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="num mt-1 text-xl font-semibold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
