import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/earnings-disclaimer")({
  head: () => ({
    meta: [
      { title: "Earnings Disclaimer | AdverX" },
      { name: "description", content: "Understand that AdverX task rewards and referral commissions are conditional and not guaranteed." },
    ],
  }),
  component: PolicyPage,
});

function PolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" aria-label="AdverX home"><BrandLogo compact className="max-h-12 max-w-[10rem]" /></Link>
        <Button asChild variant="outline" size="sm"><Link to="/"><ArrowLeft className="mr-2 size-4" /> Back to Home</Link></Button>
      </header>
      <section className="mx-auto max-w-3xl px-5 pb-16 pt-8 sm:px-8 sm:pt-14">
        <div className="mb-6 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="size-6" /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">AdverX Policies</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Earnings Disclaimer</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: October 17, 2026</p>

        <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-5 sm:p-6"><h2 className="text-lg font-semibold">No guaranteed earnings</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">AdverX does not guarantee income, profit, a fixed return, or a specific amount earned in any period. Examples and estimates are illustrative only and are not promises of results.</p></div>
        <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
          <section><h2 className="text-lg font-semibold text-foreground">1. Results vary</h2><p className="mt-2">Actual rewards depend on available tasks, verified completion, plan eligibility and limits, platform rules, available reward reserves, account status, and other operational factors. Task availability and rewards can change. Past activity or another member's results do not predict your results.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">2. Referral commissions are conditional</h2><p className="mt-2">Referral and network commissions are not automatic or guaranteed. They may depend on qualifying referrals, eligible active plans, verified activity, level rules, anti-abuse checks, and the commission rules shown by AdverX. Recruiting people alone does not guarantee earnings.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">3. Plans and fees</h2><p className="mt-2">A plan purchase provides only the access and features described on the plan page and applicable terms. It should not be interpreted as a deposit, investment, security, guaranteed-yield product, or promise that the purchase price will be recovered through rewards. Review the plan price and Refund Policy before paying.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">4. Estimates and promotional statements</h2><p className="mt-2">Any sample calculations, projections, testimonials, or promotional examples are not guarantees. Your own results may be lower, including zero. Do not make a purchase or financial decision based solely on an estimate or another person's claim; verify current plan and task information in the official platform.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">5. Withdrawals and account status</h2><p className="mt-2">A displayed balance, pending reward, or submitted withdrawal request does not by itself guarantee that funds are immediately payable. Verification, eligibility rules, reviews, processing times, and payment-provider conditions may apply. See the Terms &amp; Conditions and the current information shown in your account.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">6. Independent decisions</h2><p className="mt-2">You are responsible for evaluating whether a plan suits your circumstances and for complying with applicable laws. AdverX content is not personal financial, legal, or tax advice. If you are unsure, seek independent professional advice before making a financial commitment.</p></section>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs leading-5 text-muted-foreground">For questions about this policy, contact <a className="font-medium text-primary underline underline-offset-4" href="mailto:support@adverx.online">support@adverx.online</a>. This policy does not limit rights that cannot legally be waived under applicable law.</div>
        <footer className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground"><Link to="/" className="hover:text-foreground">Home</Link><Link to="/refund-policy" className="hover:text-foreground">Refund Policy</Link><Link to="/terms" className="hover:text-foreground">Terms &amp; Conditions</Link><Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link><Link to="/earnings-disclaimer" className="hover:text-foreground">Earnings Disclaimer</Link></footer>
      </section>
    </main>
  );
}
