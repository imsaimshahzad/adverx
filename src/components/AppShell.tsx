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
  ChevronDown,
  Check,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { usePlatform } from "@/lib/platform-store";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/LoadingIndicator";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  const [currencyMenuOpen, setCurrencyMenuOpen] = useState(false);
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
    setCurrencyMenuOpen(false);
    window.dispatchEvent(new CustomEvent("adverx-currency-change", { detail: next }));
  };

  useEffect(() => {
    if (!currencyMenuOpen) return;
    const close = () => setCurrencyMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [currencyMenuOpen]);

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
            <div className="relative" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={currencyMenuOpen}
                aria-label="Display currency"
                onClick={() => setCurrencyMenuOpen((open) => !open)}
                className="flex h-9 items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3 text-xs font-semibold text-foreground shadow-sm backdrop-blur transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold">{currency}</span>
                <span className="text-muted-foreground">{currency === "PKR" ? "Rs" : "$"}</span>
                <ChevronDown className={`size-3.5 text-muted-foreground transition-transform ${currencyMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {currencyMenuOpen ? (
                <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-36 overflow-hidden rounded-xl border border-border/70 bg-popover p-1.5 shadow-xl backdrop-blur-xl">
                  {(["PKR", "USD"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="menuitem"
                      onClick={() => changeCurrency(option)}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-foreground transition hover:bg-muted"
                    >
                      <span>{option === "PKR" ? "PKR — Rs" : "USD — $"}</span>
                      {currency === option ? <Check className="size-3.5 text-primary" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <ThemeToggle />
            <Button asChild variant="ghost" size="icon" className="relative"><Link to="/notifications" aria-label="Notifications"><Bell />{unreadCount > 0 ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" /> : null}</Link></Button>
            <Link to="/profile" aria-label="Profile"><Avatar className="size-9"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{(user?.fullName ?? "G").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar></Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1320px] min-w-0 flex-1 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <a href="https://whatsapp.com/channel/0029VbDmSMAGk1Flgs0YeW42" target="_blank" rel="noreferrer" className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-primary/15 bg-primary/[0.06] px-4 py-3 shadow-sm transition hover:bg-primary/[0.1]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-sm"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none">
  <path d="M20 11.5a8 8 0 0 1-12.5 6.6L4 19l.9-3.4A8 8 0 1 1 20 11.5Z" fill="currentColor"/>
  <path d="M8.8 8.3c.2-.3.5-.4.8-.2l1 .7c.3.2.4.5.2.8l-.4.6c.6 1 1.4 1.8 2.4 2.4l.6-.4c.3-.2.6-.1.8.2l.7 1c.2.3.1.6-.2.8l-.5.3c-.5.3-1.1.3-1.6.1-1.8-.7-4-2.9-4.7-4.7-.2-.5-.2-1.1.1-1.6l.3-.5Z" fill="#25D366"/>
</svg></div>
              <div className="min-w-0"><p className="text-sm font-semibold text-foreground">Stay connected with AdverX 📢</p><p className="truncate text-xs text-muted-foreground">Join our official WhatsApp Channel for updates & announcements.</p></div>
            </div>
            <span className="shrink-0 text-xs font-semibold text-primary">Join Channel →</span>
          </a>
          {children}
        </main>
        {showWhatsAppPrompt ? (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div role="dialog" aria-modal="true" aria-labelledby="whatsapp-channel-title" className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-background p-6 shadow-2xl">
              <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-md"><svg viewBox="0 0 24 24" aria-hidden="true" className="size-7" fill="none">
  <path d="M20 11.5a8 8 0 0 1-12.5 6.6L4 19l.9-3.4A8 8 0 1 1 20 11.5Z" fill="currentColor"/>
  <path d="M8.8 8.3c.2-.3.5-.4.8-.2l1 .7c.3.2.4.5.2.8l-.4.6c.6 1 1.4 1.8 2.4 2.4l.6-.4c.3-.2.6-.1.8.2l.7 1c.2.3.1.6-.2.8l-.5.3c-.5.3-1.1.3-1.6.1-1.8-.7-4-2.9-4.7-4.7-.2-.5-.2-1.1.1-1.6l.3-.5Z" fill="#25D366"/>
</svg></div>
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
