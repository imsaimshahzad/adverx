import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldCheck,
  Wallet,
  ListChecks,
  Network,
  ReceiptText,
  ChevronDown,
  Menu,
  X,
  CreditCard,
  CircleDollarSign,
  Activity,
  LockKeyhole,
  Linkedin,
  Twitter,
  Facebook,
  Maximize2,
  Search,
  SlidersHorizontal,
  Zap,
} from "lucide-react";

import { AppShell, StatTile } from "@/components/AppShell";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { BrandLogo } from "@/components/BrandLogo";
import { HeroTrustStrip, useHomepageHero } from "@/components/HomepageHeroSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { money, PLANS, usePlatform } from "@/lib/platform-store";
import { useState } from "react";
import "@/morphic-dashboard.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AdverX — Complete tasks. Earn rewards. Track everything." },
      {
        name: "description",
        content:
          "A simple rewards workspace for verified ad tasks, wallet tracking, network activity, and withdrawals.",
      },
      { property: "og:title", content: "AdverX" },
      {
        property: "og:description",
        content:
          "Complete verified tasks, monitor your rewards, and manage your account from one workspace.",
      },
    ],
  }),
  component: Dashboard,
});

function PublicHome() {
  const { state } = usePlatform();
  const plans = PLANS;
  const hero = useHomepageHero();

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <PublicHeader />
      <section className="relative border-b border-border/70 bg-gradient-to-br from-primary/[0.07] via-background to-violet-500/[0.06]">
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-10 pt-7 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:pb-14 lg:pt-10">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-primary">
              <span className="size-2 rounded-full bg-primary" /> ADVERX
            </p>
            <h1 className="max-w-2xl text-balance text-5xl font-bold leading-[0.96] tracking-[-0.055em] sm:text-6xl lg:text-[4.35rem]">
              {hero.headline}
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              {hero.subtext}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="shadow-sm transition-transform hover:-translate-y-0.5">
                <Link to={hero.ctaLink}>{hero.ctaText} <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg"><Link to="/login">Sign In</Link></Button>
            </div>
          </div>
          <div className="relative lg:translate-y-1">
            <div className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-primary/20 via-violet-500/10 to-cyan-400/10 blur-3xl" />
            <DashboardPreview compact />
          </div>
        </div>
      </section>
      <HeroTrustStrip />
      <TrustStrip />
      <Testimonials value={hero.testimonials} />
      <HowItWorks />
      <section id="workspace" className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
        <SectionIntro eyebrow="THE WORKSPACE" title="Everything in one workspace" text="A clear view of the information that matters: tasks, rewards, plans, network activity, and transaction history." />
        <DashboardPreview />
      </section>
      <FeatureSection />
      <PlansPreview plans={plans} />
      <WhyAdNet />
      <Faq />
      <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-8 lg:pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-violet-600 to-primary px-6 py-10 text-primary-foreground shadow-[0_24px_70px_-30px_hsl(var(--primary)/0.65)] sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-14 lg:py-11">
          <div><p className="text-3xl font-semibold tracking-tight sm:text-4xl">Ready to get started?</p><p className="mt-3 max-w-xl text-primary-foreground/75">Create your AdverX account and explore your available tasks.</p></div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0"><Button asChild variant="secondary" size="lg"><Link to="/login">Create Account</Link></Button><Button asChild variant="outline" size="lg" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"><Link to="/login">Sign In</Link></Button></div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}

function PublicHeader() {
  return (
    <header className="mx-auto flex min-h-[4rem] w-full max-w-7xl items-center justify-between gap-4 px-5 py-2 lg:px-8">
      <Link to="/" aria-label="AdverX home" className="shrink-0 rounded-md py-1 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <BrandLogo className="h-14 w-auto max-w-[15rem] object-contain sm:h-16 sm:max-w-[16rem]" />
      </Link>
      <nav className="hidden flex-1 items-center justify-center gap-5 text-sm font-medium text-muted-foreground md:flex">
        <a href="#workspace" className="transition-colors hover:text-foreground">Workspace</a>
        <a href="#how-it-works" className="transition-colors hover:text-foreground">How it works</a>
        <a href="#plans" className="transition-colors hover:text-foreground">Plans</a>
        <a href="#faq" className="transition-colors hover:text-foreground">FAQ</a>
      </nav>
      <div className="flex shrink-0 items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/login">Sign In</Link></Button>
        <Button asChild size="sm"><Link to="/signup">Get Started</Link></Button>
      </div>
    </header>
  );
}

function TrustStrip() {
  const items = [[CheckCircle2, "Verified Tasks"], [ReceiptText, "Transparent History"], [LockKeyhole, "Secure Account"], [CreditCard, "Tracked Withdrawals"]] as const;
  return <section className="border-b border-border/70 bg-card/70 backdrop-blur"><div className="mx-auto flex max-w-7xl flex-wrap gap-x-8 gap-y-3 px-5 py-4 text-sm text-muted-foreground lg:px-8">{items.map(([Icon, label]) => <span key={label} className="flex items-center gap-2"><Icon className="size-4 text-primary" />{label}</span>)}</div></section>;
}

function SectionIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div className="max-w-2xl"><p className="text-xs font-semibold tracking-[0.18em] text-primary">{eyebrow}</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2><p className="mt-4 text-base leading-7 text-muted-foreground">{text}</p></div>; }

function Testimonials({ value }: { value: string }) { let items: Array<{ name: string; quote: string }> = []; try { items = JSON.parse(value); } catch { items = []; } return <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-[4.5rem]"><SectionIntro eyebrow="CUSTOMER STORIES" title="Built for confidence" text="A clearer workspace helps members stay focused on the work that matters." /><div className="mt-7 grid gap-4 md:grid-cols-2">{items.slice(0, 3).map((item) => <figure key={item.name} className="surface p-6"><blockquote className="text-sm leading-6 text-muted-foreground">“{item.quote}”</blockquote><figcaption className="mt-5 text-sm font-semibold">{item.name}</figcaption></figure>)}</div></section>; }

function HowItWorks() {
  const steps = [["01", "Choose a plan", "Select an available plan that matches your needs."], ["02", "Complete tasks", "Complete eligible verified ad tasks according to the available limits."], ["03", "Track & withdraw", "Monitor your rewards and request withdrawals from your wallet when eligible."]];
  return <section id="how-it-works" className="border-y border-border/70 bg-muted/20"><div className="mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20"><SectionIntro eyebrow="HOW IT WORKS" title="A straightforward way to use your workspace" text="The important steps stay visible, so you can make decisions from current account information." /><div className="mt-8 grid gap-4 md:grid-cols-3">{steps.map(([number, title, text]) => <div key={number} className="surface border-t-2 border-t-primary p-6"><p className="font-mono text-sm text-primary">{number}</p><h3 className="mt-7 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></div>)}</div></div></section>;
}

function DashboardPreview({ compact = false }: { compact?: boolean }) {
  return <div className={`surface overflow-hidden border-primary/15 bg-card/95 shadow-[0_24px_80px_-34px_hsl(var(--foreground)/0.35)] ${compact ? "p-3 sm:p-5" : "mt-10 p-3 sm:p-5"}`}><div className="flex items-center justify-between border-b border-border/70 px-2 pb-4"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-success" /><span className="text-xs font-medium text-muted-foreground">Overview</span></div><span className="text-xs text-muted-foreground">AdverX workspace</span></div><div className="grid gap-3 p-1 pt-4 sm:grid-cols-2 lg:grid-cols-4"><PreviewMetric icon={Wallet} label="Wallet balance" value="PKR 24,850" /><PreviewMetric icon={CircleDollarSign} label="Today&apos;s rewards" value="PKR 1,250" /><PreviewMetric icon={ListChecks} label="Available tasks" value="8 tasks" /><PreviewMetric icon={ShieldCheck} label="Active plan" value="Lifetime Access" /></div><div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-2xl border border-border/70 p-4"><div className="flex items-center justify-between"><p className="text-sm font-medium">Today&apos;s tasks</p><span className="text-xs text-muted-foreground">3 of 8 complete</span></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full w-[38%] rounded-full bg-primary" /></div><div className="mt-5 grid gap-3 sm:grid-cols-3"><TaskRow label="Brand survey" status="Completed" done /><TaskRow label="Product review" status="Available" /><TaskRow label="Video verification" status="Available" /></div></div><div className="rounded-2xl border border-border/70 p-4"><p className="text-sm font-medium">Recent activity</p><div className="mt-3 space-y-3"><ActivityRow label="Ad reward credited" detail="Today, 10:42" amount="+ PKR 250" positive /><ActivityRow label="Referral reward" detail="Yesterday, 16:20" amount="+ PKR 120" positive /><ActivityRow label="Withdrawal requested" detail="Mon, 09:15" amount="PKR 3,000" /></div></div></div></div>;
}

function PreviewMetric({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) { return <div className="rounded-2xl bg-muted/45 p-4"><Icon className="size-4 text-primary" /><p className="mt-5 text-xs text-muted-foreground">{label}</p><p className="mt-1 text-base font-semibold">{value}</p></div>; }
function TaskRow({ label, status, done = false }: { label: string; status: string; done?: boolean }) { return <div className="flex items-center gap-2 text-xs"><CheckCircle2 className={done ? "size-4 text-success" : "size-4 text-muted-foreground/40"} /><span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span><span className="text-[10px] text-muted-foreground">{status}</span></div>; }
function ActivityRow({ label, detail, amount, positive = false }: { label: string; detail: string; amount: string; positive?: boolean }) { return <div className="flex items-center gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted"><ReceiptText className="size-3.5 text-muted-foreground" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{label}</p><p className="text-[10px] text-muted-foreground">{detail}</p></div><span className={positive ? "text-xs font-medium text-success" : "text-xs text-muted-foreground"}>{amount}</span></div>; }

function FeatureSection() {
  const features: Array<[typeof ListChecks, string, string]> = [[ListChecks, "Daily Tasks", "See eligible tasks and completion status in one place."], [TrendingUp, "Reward Tracking", "Track credited rewards and your available balance."], [Network, "Network", "View referral activity and eligible network rewards."], [CreditCard, "Withdrawals", "Submit and monitor withdrawal requests with clear status history."]];
  return <section className="border-y border-border/70 bg-muted/20"><div className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-20"><SectionIntro eyebrow="FEATURES" title="Designed around the information you need" text="Keep an eye on daily activity without losing the context behind your account." /><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map(([Icon, title, text]) => <div key={title as string} className="surface p-5"><Icon className="size-5 text-primary" /><h3 className="mt-5 text-sm font-semibold">{title as string}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text as string}</p></div>)}</div></div></section>;
}

function PlansPreview({ plans }: { plans: typeof PLANS }) { return <section id="plans" className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20"><SectionIntro eyebrow="PLANS" title="Choose your plan" text="Review the plans currently available in your account system." /><div className="mt-8 grid gap-4 md:grid-cols-3">{plans.length ? plans.map((plan) => <div key={plan.id} className="surface flex flex-col p-6"><h3 className="font-semibold">{plan.name}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{plan.description}</p><p className="mt-6 text-3xl font-semibold">{money(plan.price)}</p><p className="mt-1 text-sm text-muted-foreground">One-time payment · Lifetime access</p><div className="mt-6 space-y-2 border-t border-border/70 pt-4 text-sm text-muted-foreground"><p>✓ {plan.dailyAdLimit} eligible tasks per day</p><p>✓ Direct referral: {plan.referrerCommissionPct}%</p>{plan.indirectReferralPct > 0 ? <p>✓ Indirect referral: {plan.indirectReferralPct}% · Up to Level 6 earnings</p> : <p>✓ Indirect referral: Not included</p>}</div><Button asChild variant="outline" className="mt-6 w-full"><Link to="/plans">View Plan <ArrowRight className="size-4" /></Link></Button></div>) : <div className="surface p-8 text-sm text-muted-foreground md:col-span-3">No plans are currently available.</div>}</div></section>; }

function WhyAdNet() { return <section className="border-y border-border/70 bg-gradient-to-br from-violet-500/[0.06] via-muted/20 to-primary/[0.05]"><div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[.8fr_1.2fr] lg:px-8 lg:py-20"><SectionIntro eyebrow="WHY ADVERX" title="Built around clarity" text="A structured account experience makes it easier to understand what is available and what has already happened." /><div className="grid gap-3 sm:grid-cols-2">{["Clear task eligibility", "Visible reward history", "Wallet transaction history", "Structured withdrawal flow", "Protected account access"].map((item) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background p-4 text-sm"><CheckCircle2 className="size-4 text-primary" />{item}</div>)}</div></div></section>; }

function Faq() {   const items: Array<[string, string]> = [["How do tasks work?", "Available tasks are shown in your workspace when your account has an eligible plan. Completion and daily limits are tracked by the system."], ["How are rewards calculated?", "Rewards are credited after a verified task is completed and are subject to the limits and reserve available to your plan."], ["When can I request a withdrawal?", "You can request a withdrawal when your account meets the current eligibility rules and has sufficient available wallet balance."], ["How do referrals work?", "Referral activity and eligible network rewards are tracked in your account workspace according to the active referral rules."], ["Are plans lifetime or time-limited?", "The available plan card identifies whether a plan provides lifetime access or a time-limited duration."], ["Where can I see my transaction history?", "Your wallet and transaction history are available after signing in to your account."]]; return <section id="faq" className="mx-auto max-w-3xl px-5 py-16 lg:py-20"><SectionIntro eyebrow="FAQ" title="Common questions" text="Straight answers about using the AdverX workspace." /><div className="mt-10 divide-y divide-border rounded-2xl border border-border/70 bg-card">{items.map(([question, answer]) => <details key={question} className="group p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium"><span>{question}</span><ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" /></summary><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{answer}</p></details>)}</div></section>; }

function PublicFooter() {
  return (
    <footer className="border-t border-border/70 bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 sm:py-12 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="min-w-0">
          <Link to="/" aria-label="AdverX home" className="inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <BrandLogo compact className="max-h-14 max-w-[10.5rem] sm:max-h-16 sm:max-w-[13rem]" />
          </Link>
          <p className="mt-4 max-w-xs text-xs leading-5 text-muted-foreground">A clear workspace for verified tasks and rewards.</p>
        </div>
        <div className="flex flex-col gap-5 sm:items-end">
          <nav className="flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground" aria-label="Footer navigation">
            <Link to="/" className="hover:text-foreground">Home</Link><Link to="/plans" className="hover:text-foreground">Plans</Link><a href="#privacy" className="hover:text-foreground">Privacy Policy</a><a href="#terms" className="hover:text-foreground">Terms</a><a href="mailto:support@adverx.online" className="hover:text-foreground">Contact</a><Link to="/login" className="hover:text-foreground">Sign In</Link>
          </nav>
          <div className="flex items-center gap-3" aria-label="Social links">
            <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="rounded-md border p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"><Linkedin className="size-4" /></a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" aria-label="Twitter" className="rounded-md border p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"><Twitter className="size-4" /></a>
            <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook" className="rounded-md border p-2 text-muted-foreground transition-colors hover:border-primary hover:text-primary"><Facebook className="size-4" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function Dashboard() {
  const {
    state,
    plan,
    availableBalance,
    todaysEarnings,
    adsCompletedToday,
    dailyAdLimit,
    activityLevel,
    activityScore,
    ready,
  } = usePlatform();

  const pendingDeposit = state.deposits.find((d) => d.status === "pending");
  const activeMembers = state.network.filter((m) => m.active).length;
  const [expanded, setExpanded] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-5 text-sm text-muted-foreground">
        <span className="flex flex-col items-center gap-3"><LoadingIndicator size="md" label="Loading your account" /><span>Loading your account…</span></span>
      </main>
    );
  }

  if (!state.user) {
    return <PublicHome />;
  }

  return (
    <AppShell
      title={`Hi, ${state.user?.fullName?.split(" ")[0] ?? "there"}`}
      subtitle={plan ? `${plan.name} Plan Active` : "No Active Plan"}
    >
      <section className={`morphic-hero relative overflow-hidden ${expanded ? "is-expanded" : ""}`}>
        <div className="morphic-orb morphic-orb-one" />
        <div className="morphic-orb morphic-orb-two" />
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <p className="morphic-eyebrow">Available earnings</p>
            <p className="morphic-number num">{money(availableBalance)}</p>
            <p className="morphic-caption">Available now · rewards are credited instantly</p>
          </div>
          <button type="button" aria-label="Expand earnings details" className="morphic-icon-button" onClick={() => setExpanded((value) => !value)}><Maximize2 className="size-4" /></button>
        </div>
        <div className="relative z-10 mt-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="morphic-label">Today</p><p className="num text-xl font-semibold">{money(todaysEarnings)}</p></div>
          <Button asChild variant="secondary" size="sm" className="morphic-action"><Link to="/withdraw">Withdraw <ArrowRight className="size-4" /></Link></Button>
        </div>
        <div className={`morphic-detail ${expanded ? "is-visible" : ""}`} aria-hidden={!expanded}><div><p className="morphic-label">Momentum</p><p className="text-sm font-semibold">{activityLevel} · {activityScore}% active</p></div><div><p className="morphic-label">Next focus</p><p className="text-sm font-semibold">{Math.max((dailyAdLimit || 0) - adsCompletedToday, 0)} task{Math.max((dailyAdLimit || 0) - adsCompletedToday, 0) === 1 ? "" : "s"} remaining</p></div></div>
      </section>

      <div className="morphic-tools mt-4">
        <div className="flex items-center gap-2"><Zap className="size-4 text-primary" /><span className="text-sm font-medium">Adaptive focus</span><span className="text-xs text-muted-foreground">{focusMode ? "Prioritizing your active work" : "Tune your workspace"}</span></div>
        <button type="button" className="morphic-tool-button" onClick={() => setFocusMode((value) => !value)}><SlidersHorizontal className="size-3.5" /> {focusMode ? "Focused" : "Personalize"}</button>
      </div>

      {!plan && (
        <div className="surface mt-4 p-4">
          {pendingDeposit ? (
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 size-5 text-warning" />
              <div>
                <p className="text-sm font-medium">Deposit Pending</p>
                <p className="text-xs text-muted-foreground">
                  PKR {money(pendingDeposit.amount)} deposit is being verified.
                  Your plan activates right after approval.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Activate a plan to start</p>
                <p className="text-xs text-muted-foreground">
                  Plan activation unlocks daily ad tasks, network rewards and
                  withdrawals.
                </p>
              </div>
              <Button asChild size="sm" className="w-full">
                <Link to="/plans">View plans</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      <div className={`morphic-stats mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 ${focusMode ? "is-focused" : ""}`}>
        <div className="morphic-search col-span-2 flex items-center gap-2 sm:col-span-4"><Search className="size-4 text-muted-foreground" /><span>Search your workspace</span><kbd>⌘ K</kbd></div>
        <StatTile
          label="Ads"
          value={`${adsCompletedToday} / ${dailyAdLimit || "—"}`}
          hint="Completed today"
        />
        <StatTile
          label="Network"
          value={`${activeMembers}`}
          hint={`${state.network.length} total members`}
        />
        <StatTile label="Today" value={money(todaysEarnings)} hint="Rewards credited" />
        <StatTile label="Level" value={activityLevel} hint={`${activityScore}% activity`} />
      </div>

      <div className="surface mt-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" />
            <p className="text-sm font-medium">Activity level</p>
          </div>
          <Badge variant="secondary">{activityLevel}</Badge>
        </div>
        <Progress value={activityScore} className="mt-3" />
        <p className="mt-2 text-xs text-muted-foreground">
          Keep completing daily tasks and growing an active network to improve
          your level.
        </p>
      </div>

      {plan && (
        <div className="surface mt-3 p-4">
          <p className="text-sm font-medium">Today&apos;s tasks</p>
          <div className="mt-3 space-y-2">
            {Array.from({ length: dailyAdLimit }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2
                  className={
                    i < adsCompletedToday
                      ? "size-4 text-success"
                      : "size-4 text-muted-foreground/40"
                  }
                />
                <span
                  className={
                    i < adsCompletedToday
                      ? "text-muted-foreground line-through"
                      : ""
                  }
                >
                  Ad task {i + 1}
                </span>
              </div>
            ))}
          </div>
          <Button asChild size="sm" variant="outline" className="mt-3 w-full">
            <Link to="/ads">Go to ads</Link>
          </Button>
        </div>
      )}
    </AppShell>
  );
}
