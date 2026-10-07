import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  UserPlus,
  User,
  WalletCards,
  Sparkles,
  BadgeCheck,
  History,
  Lock,
  Receipt,
  FileCheck2,
  ArrowLeftRight,
  Shield,
  Rocket,
  Globe,
  MessageCircle,
  Send,
  XCircle,
  ChevronRight,
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
} from "lucide-react";

import { AppShell, StatTile } from "@/components/AppShell";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { BrandLogo } from "@/components/BrandLogo";
import { HeroTrustStrip, useHomepageHero } from "@/components/HomepageHeroSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { money, PLANS, PUBLIC_MIN_WITHDRAWAL, WITHDRAWAL_METHODS, usePlatform } from "@/lib/platform-store";
import { useEffect, useState } from "react";
import "@/morphic-dashboard.css";
import "@/public-landing.css";

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

function PublicIcon({ name, className = "" }: { name: string; className?: string }) {
  const props = { className };
  switch (name) {
    case "person_add": return <UserPlus {...props} />;
    case "person": return <User {...props} />;
    case "arrow_forward": return <ArrowRight {...props} />;
    case "account_balance_wallet": return <WalletCards {...props} />;
    case "paid": return <CircleDollarSign {...props} />;
    case "check_circle": return <CheckCircle2 {...props} />;
    case "stars": return <Sparkles {...props} />;
    case "cancel": return <XCircle {...props} />;
    case "verified_user": return <BadgeCheck {...props} />;
    case "history_edu": return <History {...props} />;
    case "lock": return <Lock {...props} />;
    case "receipt_long": return <Receipt {...props} />;
    case "fact_check": return <FileCheck2 {...props} />;
    case "trending_up": return <TrendingUp {...props} />;
    case "receipt": return <Receipt {...props} />;
    case "sync_alt": return <ArrowLeftRight {...props} />;
    case "shield": return <Shield {...props} />;
    case "expand_more": return <ChevronDown {...props} />;
    case "rocket_launch": return <Rocket {...props} />;
    case "public": return <Globe {...props} />;
    case "forum": return <MessageCircle {...props} />;
    case "send": return <Send {...props} />;
    case "chevron_right": return <ChevronRight {...props} />;
    default: return null;
  }
}

function PublicHome() {
  const [pageReady, setPageReady] = useState(false);
  const { state, availableBalance, todaysEarnings, adsCompletedToday, dailyAdLimit, plan } = usePlatform();
  const plans = PLANS;
  const activeMembers = state.network.filter((member) => member.active).length;
  const tasksRemaining = Math.max((dailyAdLimit || 0) - adsCompletedToday, 0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setPageReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const faqItems = [
    ["How do tasks work?", "Available verified ad tasks are shown in your workspace when your account has an eligible plan. Completion and daily limits are tracked by the system."],
    ["How are rewards calculated?", "Rewards are credited after a verified task is completed and are subject to the active plan limits and reward rules."],
    ["When can I request a withdrawal?", "You can request a withdrawal when your account meets the current eligibility rules and has sufficient available wallet balance. The current minimum is " + (Number.isFinite(PUBLIC_MIN_WITHDRAWAL) ? money(PUBLIC_MIN_WITHDRAWAL) : "the configured threshold") + "."],
    ["How do referrals work?", "Share your referral invite code. Direct commissions and eligible indirect network rewards are calculated according to the active plan and current referral rules."],
    ["Are plans lifetime or time-limited?", "The plan cards below show the current duration configured for each available plan. Where no duration is configured, the plan is lifetime access."],
    ["Where can I see my transaction history?", "Sign in to your AdverX workspace to view your wallet and transaction history with the latest account activity."],
  ];
  return (
    <div
      style={{ visibility: pageReady ? "visible" : "hidden" }}
      aria-hidden={!pageReady}
    >
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 px-gutter flex items-center justify-between">
          <div className="flex items-center gap-space-xs"><div className="flex items-center gap-1.5"><BrandLogo className="h-7 w-auto object-contain" /><span className="bg-secondary-container text-on-secondary-container font-label-overline text-label-overline px-space-2xs py-0.5 rounded-full">PRO</span></div><div className="h-4 w-px bg-outline-variant/40 ml-space-2xs" /><span className="font-label-md text-label-md text-on-surface-variant truncate max-w-[110px]">Dashboard</span></div>
          <div className="flex items-center gap-space-xs"><Link aria-label="Sign Up" to="/signup" className="h-11 px-space-sm rounded-lg bg-primary-container text-on-primary-container font-label-md text-label-md flex items-center justify-center hover:bg-primary transition-colors"><PublicIcon name="person_add" className="size-[18px] mr-1" />Sign Up</Link><Link to="/login" aria-label="Log in" className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-sm"><PublicIcon name="person" className="size-[18px] text-on-primary" /></Link></div>
        </div>
      </header>
      <main className={`flex flex-col relative w-full pt-16 bg-surface flex-1 adverx-reference-page ${pageReady ? "is-ready" : ""}`} aria-busy={!pageReady}>
      <div className="flex flex-col w-full">
        <section className="px-gutter pt-space-md pb-space-lg flex flex-col">
          <div className="inline-flex items-center gap-1.5 self-start bg-surface-container-high px-space-xs py-1 rounded-full mb-space-sm"><span className="w-2 h-2 rounded-full bg-primary animate-pulse" /><span className="font-label-overline text-label-overline text-primary uppercase">AdverX Workspace</span></div>
          <h1 className="font-display-hero-mobile text-display-hero-mobile text-on-surface font-extrabold mb-space-xs">Complete tasks.<br /><span className="text-primary">Earn rewards.</span><br />Track everything.</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-space-md leading-relaxed">A clean, high-clarity rewards workspace where you can execute verified ad tasks, monitor instantaneous earnings, expand your tier network, and safely withdraw cash.</p>
          <div className="flex flex-col gap-space-xs w-full mb-space-lg"><Link className="w-full h-12 rounded-lg bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform" to="/signup">Create Free Account <PublicIcon name="arrow_forward" className="size-[18px]" /></Link><Link className="w-full h-12 rounded-lg bg-surface-container text-on-surface font-label-lg text-label-lg flex items-center justify-center active:bg-surface-container-high transition-colors" to="/login">Log In</Link></div>
          <div className="relative w-full rounded-xl bg-surface-container-lowest p-space-md shadow-lg overflow-hidden">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-primary-fixed-dim/30 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center justify-between pb-space-sm mb-space-sm"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-secondary" /><span className="font-label-overline text-label-overline uppercase text-on-surface-variant">Live Overview</span></div><span className="font-label-md text-label-md text-primary font-semibold">{plan?.name ? plan.name + " Member" : "Active Member"}</span></div>
            <div className="grid grid-cols-2 gap-space-xs mb-space-md">
              <div className="bg-surface-container-low p-space-xs rounded-lg"><div className="flex items-center gap-1.5 text-on-surface-variant mb-1"><PublicIcon name="account_balance_wallet" className="size-4 text-primary" /><span className="font-label-overline text-label-overline">Wallet balance</span></div><p className="font-metric-lg text-metric-lg text-on-surface font-bold tracking-tight">{money(availableBalance || 0)}</p></div>
              <div className="bg-surface-container-low p-space-xs rounded-lg"><div className="flex items-center gap-1.5 text-on-surface-variant mb-1"><PublicIcon name="paid" className="size-4 text-secondary" /><span className="font-label-overline text-label-overline">Today's rewards</span></div><p className="font-metric-lg text-metric-lg text-secondary font-bold tracking-tight">+{money(todaysEarnings || 0)}</p></div>
              <div className="bg-surface-container-low p-space-xs rounded-lg"><div className="flex items-center gap-1.5 text-on-surface-variant mb-1"><PublicIcon name="check_circle" className="size-4 text-tertiary" /><span className="font-label-overline text-label-overline">Tasks remaining</span></div><p className="font-metric-lg text-metric-lg text-on-surface font-bold">{tasksRemaining} tasks</p></div>
              <div className="bg-surface-container-low p-space-xs rounded-lg"><div className="flex items-center gap-1.5 text-on-surface-variant mb-1"><PublicIcon name="stars" className="size-4 text-primary-container" /><span className="font-label-overline text-label-overline">Active Plan</span></div><span className="bg-primary/10 text-primary font-label-overline text-label-overline px-2 py-0.5 rounded-full font-bold">{plan?.name || "No active plan"}</span></div>
            </div>
            <div className="bg-surface-container-low p-space-sm rounded-lg mb-space-md"><div className="flex items-center justify-between mb-2"><span className="font-headline-sm text-headline-sm font-bold text-on-surface">Daily Missions</span><span className="font-label-md text-label-md text-primary font-semibold">{adsCompletedToday} of {dailyAdLimit || 0} complete</span></div><div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden mb-space-sm"><div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style={{width: (dailyAdLimit ? Math.min((adsCompletedToday / dailyAdLimit) * 100, 100) : 0) + "%"}} /></div><div className="flex flex-col gap-2"><div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest"><span className="font-body-sm text-body-sm font-medium text-on-surface">Verified ad task</span><span className="font-label-overline text-label-overline bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-full">{adsCompletedToday > 0 ? "Completed" : "Available"}</span></div><div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest"><span className="font-body-sm text-body-sm font-medium text-on-surface">Daily reward task</span><Link to="/ads" className="font-label-overline text-label-overline bg-primary-container text-on-primary-container px-2.5 py-1 rounded-full">Open</Link></div><div className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest"><span className="font-body-sm text-body-sm font-medium text-on-surface">Wallet activity</span><Link to="/wallet" className="font-label-overline text-label-overline text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">Available</Link></div></div></div>
            <div><p className="font-label-overline text-label-overline uppercase text-on-surface-variant mb-space-xs">Recent Ledger Activity</p><div className="flex flex-col gap-2"><div className="flex items-center justify-between py-1.5 px-2 rounded-lg"><span className="font-body-sm text-body-sm font-semibold text-on-surface">Reward activity</span><span className="font-label-md text-label-md font-bold text-secondary">+{money(todaysEarnings || 0)}</span></div><div className="flex items-center justify-between py-1.5 px-2 rounded-lg"><span className="font-body-sm text-body-sm font-semibold text-on-surface">Referral activity</span><span className="font-label-md text-label-md font-bold text-secondary">Tracked</span></div><div className="flex items-center justify-between py-1.5 px-2 rounded-lg"><span className="font-body-sm text-body-sm font-semibold text-on-surface">Withdrawal activity</span><span className="font-label-md text-label-md font-bold text-on-surface">Tracked</span></div></div></div>
          </div>
        </section>
        <section className="px-gutter mb-space-lg"><div className="rounded-xl overflow-hidden shadow-sm bg-surface-container-lowest"><div className="relative h-44 w-full"><img className="w-full h-full object-cover" alt="AdverX rewards workspace" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCcP_KH61siqururzgatw1Nmk6Oqw_qcJ66jhWbcJksm1XFQbtXmP4-v9jolhd1saWjJ01WMx2Jto9qCx8gzmwoDN-XtqtghFf1JrgRN2ZExxjbIVWdGt5SR1dPgaVRm_PBFU1TDhh4LquMpALSW9VPFeOlvRFvkhDXuMWpcsa8_3J3Th1o7hT15e-79Pv-JRmoI1gxeN11KNSJkGA0Kvpx5eKYRm57Z2w8ele6zg" /><div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 via-transparent to-transparent flex items-end p-space-md"><p className="font-label-lg text-label-lg text-inverse-on-surface">Empowering micro-earners nationwide with verified payouts.</p></div></div></div></section>
        <section className="px-gutter pb-space-lg"><div className="bg-surface-container-low rounded-xl p-space-md shadow-sm"><div className="grid grid-cols-3 gap-2 text-center pb-space-md"><div><p className="font-metric-xl text-metric-xl font-extrabold text-on-surface">{activeMembers}</p><p className="font-label-overline text-label-overline text-on-surface-variant">Active Members</p></div><div><p className="font-metric-xl text-metric-xl font-extrabold text-secondary">{money(0)}</p><p className="font-label-overline text-label-overline text-on-surface-variant">Platform Payouts</p></div><div><p className="font-headline-sm text-headline-sm font-extrabold text-on-surface">Instant</p><p className="font-label-overline text-label-overline text-on-surface-variant">Approval Time</p></div></div><div className="grid grid-cols-2 gap-space-xs pt-space-sm">{[["verified_user","Verified Tasks","text-primary"],["history_edu","Transparent Ledger","text-tertiary"],["lock","Secure Vault","text-secondary"],["receipt_long","Tracked Payouts","text-primary-container"]].map(([icon,label,color])=><div key={label} className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-lowest"><PublicIcon name={icon} className={"size-5 " + color} /><span className="font-label-md text-label-md text-on-surface">{label}</span></div>)}</div></div></section>
        <section className="px-gutter pb-space-lg flex flex-col"><div className="mb-space-sm"><span className="font-label-overline text-label-overline text-primary uppercase">Customer Stories</span><h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Built for confidence</h2><p className="font-body-md text-body-md text-on-surface-variant">A clearer workspace helps members stay focused on what matters.</p></div><div className="flex flex-col gap-space-sm">
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm"><div className="flex items-center gap-1 text-secondary mb-2">★★★★★</div><blockquote className="font-body-md text-body-md text-on-surface mb-space-sm italic">“The dashboard makes every reward easy to understand. Within 15 minutes of joining, my task credits reflect instantly.”</blockquote><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container"><img className="w-full h-full object-cover" alt="Ayesha Khan" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDV7vb7xbwBvHXJhh_8m8k8eHze7bRCaofPi8r9iwUN8Y1IlH93MMSb1vELdQGmwSRFZXwvdhblJ36QlYbVcwt_xpR24d4lEbzK8srSTQDgGjhX0zfu3DvOMzWMnWpwBdgyWqIrtHrf9CK_7aply1SCXWF7EPUwin4tURyxBXoN7edBdir7qKZxjlxbw_eSa-WYKEwa0X_aIH_H_IDCkKIOGStnhuElRNtLOWuBaQ" /></div><div><p className="font-label-lg text-label-lg font-bold text-on-surface">Ayesha Khan</p><p className="font-body-sm text-body-sm text-on-surface-variant">Tier Member • Karachi</p></div></div></div>
          <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm"><div className="flex items-center gap-1 text-secondary mb-2">★★★★★</div><blockquote className="font-body-md text-body-md text-on-surface mb-space-sm italic">“I can track daily ad limits and withdrawals without any confusion or hidden fees. Everything is clearly documented.”</blockquote><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container"><img className="w-full h-full object-cover" alt="Bilal Ahmed" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDfow_qTXO_rZfkycDVFP0G5uzxgWTeyIYc2doxAI3TRGAvLRmuOgduF_wJlkec48LllZG1Jz_DNaV3OcO0fQ6gLhnO7j6U4tXn8xoXb1rE78aA11syWTM6qi1OE9eSQjJKpVeifhTiG1KNhWXGkA5brVpIXahxGGly7IGNhynGem5qo0kNFuskhcZgNO14lUh7fT_MZX-Oa24T7yIJp1fDovw_2heEIifg0Z3KRQ" /></div><div><p className="font-label-lg text-label-lg font-bold text-on-surface">Bilal Ahmed</p><p className="font-body-sm text-body-sm text-on-surface-variant">Growth Plan Member • Islamabad</p></div></div></div>
        </div></section>
        <section className="px-gutter pb-space-lg flex flex-col"><div className="mb-space-md"><span className="font-label-overline text-label-overline text-primary uppercase">How It Works</span><h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">A straightforward way to earn</h2><p className="font-body-md text-body-md text-on-surface-variant">The important steps stay visible, so you can execute tasks seamlessly.</p></div><div className="flex flex-col gap-space-xs">{[["01","Choose a plan","Select an available plan that matches your daily schedule and goals.","bg-primary-container text-on-primary-container"],["02","Complete tasks","Execute verified ad missions according to your available plan limits.","bg-secondary-container text-on-secondary-container"],["03","Track & withdraw","Monitor credited rewards live in your wallet and request payouts when your account meets the current eligibility rules.","bg-tertiary-fixed text-on-tertiary-fixed"]].map(([n,t,d,tone])=><div key={n} className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-start gap-space-sm"><span className={"w-10 h-10 rounded-full " + tone + " font-headline-sm text-headline-sm font-bold flex items-center justify-center flex-shrink-0"}>{n}</span><div className="flex-1 min-w-0"><h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-1">{t}</h3><p className="font-body-md text-body-md text-on-surface-variant">{d}</p></div></div>)}</div></section>
        <section className="px-gutter pb-space-lg flex flex-col" id="plans-section"><div className="mb-space-md"><span className="font-label-overline text-label-overline text-primary uppercase">Transparent Pricing</span><h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Choose your plan</h2><p className="font-body-md text-body-md text-on-surface-variant">One-time enrollment. No recurring monthly deductions. Review the plans currently available.</p></div><div className="flex flex-col gap-space-md">{plans.map((item)=>{const isPro=item.name.toLowerCase().includes("pro");const isGrowth=item.name.toLowerCase().includes("growth");return <div key={item.id||item.name} className={"bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col relative overflow-hidden " + (isPro ? "shadow-xl" : "")}>{isPro&&<div className="absolute top-0 right-0 bg-primary text-on-primary font-label-overline text-label-overline px-4 py-1 rounded-bl-lg uppercase tracking-wider font-bold">Recommended</div>}<div className="flex items-center justify-between mb-space-xs"><span className="font-headline-sm text-headline-sm font-bold text-on-surface">{item.name}</span><span className="font-label-overline text-label-overline bg-surface-container text-on-surface-variant px-2.5 py-1 rounded-full uppercase">{isPro?"VIP":isGrowth?"Popular Value":"Entry Level"}</span></div><div className="flex items-baseline gap-1 mb-1"><span className={"font-metric-xl text-metric-xl font-extrabold " + (isPro?"text-primary":"text-on-surface") + " tracking-tight"}>{money(item.price)}</span><span className="font-body-sm text-body-sm text-on-surface-variant">one-time</span></div><p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">{item.description}</p><div className="flex flex-col gap-2.5 mb-space-lg"><div className="flex items-center gap-2.5"><PublicIcon name="check_circle" className="size-5 text-primary" /><span className="font-body-md text-body-md text-on-surface font-medium">{item.dailyAdLimit} ad tasks per day</span></div><div className="flex items-center gap-2.5"><PublicIcon name="check_circle" className="size-5 text-primary" /><span className="font-body-md text-body-md text-on-surface font-medium">{item.durationDays ? item.durationDays + " days validity" : "Lifetime access guarantee"}</span></div><div className="flex items-center gap-2.5"><PublicIcon name="check_circle" className="size-5 text-primary" /><span className="font-body-md text-body-md text-on-surface font-medium">Direct referral: {item.referrerCommissionPct}% bonus</span></div><div className="flex items-center gap-2.5"><span className="material-symbols-outlined text-[20px] text-primary">{item.indirectReferralPct > 0 ? "stars" : "cancel"}</span><span className={"font-body-md text-body-md " + (item.indirectReferralPct > 0 ? "text-on-surface font-bold" : "text-on-surface-variant line-through")}>{item.indirectReferralPct > 0 ? "Indirect referral: " + item.indirectReferralPct + "% · Up to Level 6 earnings" : "Indirect multi-level referrals"}</span></div><div className="flex items-center gap-2.5"><PublicIcon name="check_circle" className="size-5 text-primary" /><span className="font-body-md text-body-md text-on-surface font-medium">Minimum withdrawal {Number.isFinite(PUBLIC_MIN_WITHDRAWAL)?money(PUBLIC_MIN_WITHDRAWAL):"Not set"}</span></div><div className="flex items-center gap-2.5"><PublicIcon name="check_circle" className="size-5 text-primary" /><span className="font-body-md text-body-md text-on-surface font-medium">{item.networkEligible?(isPro?"Priority network payouts enabled":"Network rewards enabled"):"No network rewards"}</span></div></div><Link to="/plans" className={"w-full h-12 rounded-lg " + (isPro?"bg-primary text-on-primary shadow-md":"bg-surface-container text-on-surface") + " font-label-lg text-label-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"}>{isPro?"Activate "+item.name+" Plan":"Select "+item.name+" Plan"}<PublicIcon name={isPro ? "arrow_forward" : "chevron_right"} className="size-[18px]" /></Link></div>})}</div></section>
        <section className="px-gutter pb-space-lg"><div className="bg-surface-container-low rounded-xl p-space-md"><div className="mb-space-sm"><span className="font-label-overline text-label-overline text-primary uppercase">Why AdverX</span><h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Built around clarity</h2><p className="font-body-md text-body-md text-on-surface-variant">A structured account experience makes it effortless to know what is available and what has already happened.</p></div><div className="flex flex-col gap-2">{[["fact_check","Clear task eligibility without ambiguity"],["trending_up","Visible and verifiable reward history"],["receipt","Itemized wallet transaction ledger"],["sync_alt","Automated, structured withdrawal flow"],["shield","Protected member account access"]].map(([icon,label])=><div key={label} className="p-3 rounded-lg bg-surface-container-lowest flex items-center gap-3"><span className="material-symbols-outlined text-[22px] text-primary">{icon}</span><span className="font-label-lg text-label-lg text-on-surface">{label}</span></div>)}</div></div></section>
        <section className="px-gutter pb-space-xl flex flex-col"><div className="mb-space-sm"><span className="font-label-overline text-label-overline text-primary uppercase">FAQ</span><h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Common questions</h2><p className="font-body-md text-body-md text-on-surface-variant">Straight answers about using the AdverX workspace.</p></div><div className="flex flex-col gap-space-xs" id="faq-container">{faqItems.map(([q,a],i)=>{const open=openFaq===i;return <div key={q} className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden"><button className="w-full p-space-md flex items-center justify-between text-left focus:outline-none" onClick={()=>setOpenFaq(open?null:i)}><span className="font-label-lg text-label-lg font-semibold text-on-surface">{q}</span><PublicIcon name="expand_more" className={"size-6 text-on-surface-variant transform transition-transform duration-200 " + (open ? "rotate-180" : "")} /></button>{open&&<div className="px-space-md pb-space-md font-body-md text-body-md text-on-surface-variant">{a}</div>}</div>})}</div></section>
        <section className="px-gutter pb-space-xl"><div className="bg-gradient-to-br from-primary via-primary-container to-tertiary text-on-primary rounded-xl p-space-lg shadow-xl relative overflow-hidden flex flex-col items-center text-center"><div className="w-14 h-14 rounded-full bg-surface-container-lowest/20 flex items-center justify-center mb-space-sm backdrop-blur-md"><span className="material-symbols-outlined text-[32px] text-white">rocket_launch</span></div><h2 className="font-headline-lg text-headline-lg font-extrabold mb-space-xs text-white">Ready to get started?</h2><p className="font-body-md text-body-md text-on-primary-container mb-space-lg max-w-xs">Create your AdverX account in less than two minutes and explore your daily reward queue.</p><div className="flex flex-col gap-space-xs w-full max-w-xs"><Link className="w-full h-12 rounded-lg bg-surface-container-lowest text-on-surface font-label-lg text-label-lg flex items-center justify-center font-bold shadow-md active:scale-95 transition-transform" to="/signup">Create Free Account</Link><Link className="w-full h-12 rounded-lg bg-white/10 text-white font-label-lg text-label-lg flex items-center justify-center active:bg-white/20 transition-colors" to="/login">Log In</Link></div></div></section>
        <footer className="px-gutter pb-space-2xl pt-space-md border-t-0 bg-surface-container-low flex flex-col items-center text-center"><div className="flex items-center gap-1.5 mb-2"><BrandLogo compact className="h-6 w-auto object-contain" /><span className="bg-secondary-container text-on-secondary-container font-label-overline text-label-overline px-2 py-0.5 rounded-full font-bold">PRO</span></div><p className="font-body-sm text-body-sm text-on-surface-variant max-w-xs mb-space-md">A transparent rewards workspace for verified tasks, structured network bonuses, and secure micro-finances.</p><div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-space-md"><Link className="font-label-md text-label-md text-on-surface hover:text-primary transition-colors" to="/">Home</Link><Link className="font-label-md text-label-md text-on-surface hover:text-primary transition-colors" to="/plans">Plans</Link><a className="font-label-md text-label-md text-on-surface hover:text-primary transition-colors" href="#privacy">Privacy Policy</a><a className="font-label-md text-label-md text-on-surface hover:text-primary transition-colors" href="#terms">Terms of Service</a><a className="font-label-md text-label-md text-on-surface hover:text-primary transition-colors" href="mailto:support@adverx.online">Contact</a><Link className="font-label-md text-label-md text-primary font-bold" to="/login">Log In</Link></div><div className="flex items-center gap-3 text-on-surface-variant mb-space-md"><span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"><PublicIcon name="public" className="size-[18px]" /></span><span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"><PublicIcon name="forum" className="size-[18px]" /></span><span className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center"><PublicIcon name="send" className="size-[18px]" /></span></div><p className="font-body-sm text-[11px] text-on-surface-variant/70">© 2025 AdverX Inc. All rights reserved. Registered Rewards Platform.</p></footer>
      </div>
    </main>
    </div>
  );
}
function PublicStat({ value, label }: { value: string; label: string }) {
  return <div className="text-center"><p className="text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</p><p className="mt-1 text-xs font-semibold text-[#6b7280]">{label}</p></div>;
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

function PlansPreview({ plans }: { plans: typeof PLANS }) {
  const minimumWithdrawal = PUBLIC_MIN_WITHDRAWAL ?? WITHDRAWAL_METHODS
    .filter((method) => method.isActive && method.minWithdrawal > 0)
    .reduce((minimum, method) => Math.min(minimum, method.minWithdrawal), Number.POSITIVE_INFINITY);

  return (
    <section id="plans" className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-20">
      <SectionIntro
        eyebrow="PLANS"
        title="Choose your plan"
        text="Review the plans currently available in your account system."
      />
      <div className="mt-8 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
        {plans.length ? plans.map((plan) => (
          <div
            key={plan.id}
            className={[
              "relative flex h-full flex-col overflow-hidden rounded-xl border bg-background p-6 shadow-sm transition-all duration-200",
              "hover:-translate-y-1 hover:shadow-lg",
              plan.highlight
                ? "border-primary/50 ring-2 ring-primary/15"
                : "border-border",
            ].join(" ")}
          >
            {plan.highlight && (
              <div className="absolute right-4 top-4">
                <Badge>Popular</Badge>
              </div>
            )}

            <div className="mb-5">
              <div className="flex items-center gap-2 pr-20">
                <h3 className="text-xl font-medium text-muted-foreground">{plan.name}</h3>
              </div>

              <div className="mt-3 flex items-baseline text-foreground">
                <span className="text-2xl font-semibold">Rs.</span>
                <span className="num text-5xl font-extrabold tracking-tight">
                  {money(plan.price).replace(/^Rs\.?\s?/, "")}
                </span>
                <span className="ml-2 text-lg font-normal text-muted-foreground">
                  one-time
                </span>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
            </div>

            <ul className="my-5 flex-1 space-y-4">
              <PlanFeature>{plan.dailyAdLimit} ad tasks per day</PlanFeature>
              <PlanFeature>{plan.durationDays ? `${plan.durationDays} days validity` : "Lifetime access"}</PlanFeature>
              <PlanFeature>Direct referral: {plan.referrerCommissionPct}%</PlanFeature>
              <PlanFeature>
                {plan.indirectReferralPct > 0
                  ? `Indirect referral: ${plan.indirectReferralPct}% · Up to Level 6 earnings`
                  : "Indirect referral not included"}
              </PlanFeature>
              <PlanFeature>Minimum withdrawal {Number.isFinite(minimumWithdrawal) ? money(minimumWithdrawal) : "Not set"}</PlanFeature>
              {plan.networkEligible ? (
                <PlanFeature>Network rewards enabled</PlanFeature>
              ) : (
                <PlanFeature muted>No network rewards</PlanFeature>
              )}
            </ul>

            <Button asChild className="mt-2 w-full rounded-lg">
              <Link to="/plans">
                View Plan <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        )) : (
          <div className="surface p-8 text-sm text-muted-foreground md:col-span-3">
            No plans are currently available.
          </div>
        )}
      </div>
    </section>
  );
}

function PlanFeature({
  children,
  muted = false,
}: {
  children: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <li className={`flex items-start gap-3 ${muted ? "line-through decoration-muted-foreground/60" : ""}`}>
      <CheckCircle2
        className={`mt-0.5 size-5 shrink-0 ${muted ? "text-muted-foreground" : "text-primary"}`}
      />
      <span
        className={`text-base font-normal leading-tight ${muted ? "text-muted-foreground" : "text-foreground/80"}`}
      >
        {children}
      </span>
    </li>
  );
}

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
  const activeMembers = state.network.filter((member) => member.active).length;
  const [expanded, setExpanded] = useState(false);

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
    <AppShell title={`Hi, ${state.user?.fullName?.split(" ")[0] ?? "there"}`}>
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

      <div className="morphic-stats mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
