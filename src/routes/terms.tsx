import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions | AdverX" },
      { name: "description", content: "Read the terms that apply to AdverX accounts, plans, tasks, rewards, referrals, and withdrawals." },
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
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Terms & Conditions</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: October 17, 2026</p>

        <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-5 sm:p-6"><h2 className="text-lg font-semibold">Using AdverX</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">By accessing or using AdverX, you agree to these Terms &amp; Conditions and the linked Privacy Policy, Refund Policy, and Earnings Disclaimer. If you do not agree, do not use the service.</p></div>
        <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
          <section><h2 className="text-lg font-semibold text-foreground">1. Eligibility and account accuracy</h2><p className="mt-2">You must be legally able to enter into these terms and provide accurate, current registration and account information. Keep your login credentials confidential and promptly notify support if you suspect unauthorised access. You are responsible for activity carried out through your account, except where applicable law says otherwise.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">2. Plans and payments</h2><p className="mt-2">Plan prices, features, task limits, duration, and eligibility are the details shown on AdverX at the time of purchase. Review them carefully before paying. A plan is activated only when the platform records the required payment and activation. Do not assume a payment succeeded solely from a bank or wallet screenshot; keep your transaction reference and check your account status.</p><p className="mt-2">Plan purchases and activations are subject to the Refund Policy. Nothing in these Terms overrides a mandatory right under applicable law.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">3. Tasks and rewards</h2><p className="mt-2">Tasks must be completed genuinely and in accordance with their instructions. Rewards are not guaranteed and may depend on task verification, active plan eligibility, daily limits, available reward reserves, anti-abuse checks, and the rules displayed by AdverX. A task submission or displayed estimate is not a promise that a reward will be credited. The account ledger and verified platform records determine the recorded status, subject to correction of errors and applicable law.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">4. Referrals and network rewards</h2><p className="mt-2">Referral commissions are conditional, not guaranteed. They depend on the applicable plan rules, referral relationship, eligible active accounts, qualifying activity, and verification. Self-referrals, duplicate or fabricated accounts, misleading promotion, manipulation, and attempts to bypass eligibility rules are prohibited. AdverX may review or withhold disputed rewards while investigating suspected abuse, consistent with applicable law and the platform's records.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">5. Withdrawals</h2><p className="mt-2">Withdrawal requests are subject to the current minimums, limits, supported methods, account verification, review, and processing requirements shown in the account or platform. A submitted request is not confirmation of payment. Processing times can vary due to verification, payment providers, operational issues, or legal requirements. Never submit another person's payment details without authorisation.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">6. Acceptable use</h2><p className="mt-2">You must not use bots or scripts to fake task activity, exploit bugs, interfere with the service, attempt unauthorised access, submit false information or payment evidence, harass others, infringe rights, or use AdverX for unlawful activity. Do not sell or transfer accounts without written permission.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">7. Reviews, restrictions, and service changes</h2><p className="mt-2">Where reasonably necessary to protect users, the platform, or payment integrity, AdverX may investigate activity, request information, restrict features, or suspend accounts suspected of violating these terms. We aim to act proportionately and provide a support route where appropriate. We may update features, task availability, or platform rules; changes will not remove rights that cannot legally be waived.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">8. Platform content and availability</h2><p className="mt-2">AdverX names, designs, software, and content are protected by applicable intellectual-property laws. The service is provided on an availability basis; uninterrupted or error-free operation cannot be guaranteed. We will not exclude liability that cannot legally be excluded.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">9. Third-party services</h2><p className="mt-2">Payments, hosting, communications, or other features may rely on third-party services. Their own terms and privacy practices may apply. AdverX is not responsible for independent third-party systems to the extent permitted by law, but users may contact support about an issue affecting their AdverX account.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">10. Updates and contact</h2><p className="mt-2">We may update these Terms to reflect service or legal changes. The latest version and its update date will be published on this page. Continued use after an update means the updated terms apply to the extent permitted by law. Questions: support@adverx.online.</p></section>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs leading-5 text-muted-foreground">For questions about this policy, contact <a className="font-medium text-primary underline underline-offset-4" href="mailto:support@adverx.online">support@adverx.online</a>. This policy does not limit rights that cannot legally be waived under applicable law.</div>
        <footer className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground"><Link to="/" className="hover:text-foreground">Home</Link><Link to="/refund-policy" className="hover:text-foreground">Refund Policy</Link><Link to="/terms" className="hover:text-foreground">Terms &amp; Conditions</Link><Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link><Link to="/earnings-disclaimer" className="hover:text-foreground">Earnings Disclaimer</Link></footer>
      </section>
    </main>
  );
}
