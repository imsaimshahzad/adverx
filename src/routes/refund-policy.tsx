import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy | AdverX" },
      {
        name: "description",
        content: "Review AdverX's policy for plan purchases, activations, and payment issues.",
      },
    ],
  }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" aria-label="AdverX home"><BrandLogo compact className="max-h-12 max-w-[10rem]" /></Link>
        <Button asChild variant="outline" size="sm"><Link to="/"><ArrowLeft className="mr-2 size-4" /> Back to Home</Link></Button>
      </header>
      <section className="mx-auto max-w-3xl px-5 pb-16 pt-8 sm:px-8 sm:pt-14">
        <div className="mb-6 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="size-6" /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">AdverX Policies</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Refund Policy</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: October 17, 2026</p>
        <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
          <h2 className="text-lg font-semibold">All plan purchases are final</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">AdverX does not offer refunds or cancellations for plan purchases or plan activations. Please review the plan details and make sure your selection is correct before completing payment.</p>
        </div>
        <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
          <section><h2 className="text-lg font-semibold text-foreground">1. No standard refunds</h2><p className="mt-2">Once a plan purchase or activation has been completed, the payment is non-refundable and the plan cannot be exchanged for cash. Unused access, unused features, inactivity, or a change of mind do not qualify for a refund.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">2. Check before paying</h2><p className="mt-2">Before making a payment, review the plan price, features, eligibility requirements, and applicable terms shown on AdverX. If you are unsure about a plan, contact support before paying.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">3. Payment errors and unauthorised transactions</h2><p className="mt-2">If you believe you were charged more than once, paid but your plan was not activated, or see a transaction you did not authorise, contact support with your transaction reference and proof of payment so the issue can be investigated. Contacting support does not guarantee a refund; any correction will be handled according to applicable law and payment-provider requirements.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">4. Earnings and withdrawals</h2><p className="mt-2">This policy concerns plan-purchase refunds. Withdrawable earnings and withdrawal requests are handled under the separate rules displayed in your AdverX account. A withdrawal is not a refund of a plan purchase.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">5. Legal rights</h2><p className="mt-2">Nothing in this policy is intended to exclude or limit rights that cannot legally be waived under applicable consumer-protection law. Where mandatory law or payment-provider rules require a different outcome, those requirements will apply.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">6. Contact support</h2><p className="mt-2">For payment-related questions, email <a className="font-medium text-primary underline underline-offset-4" href="mailto:support@adverx.online">support@adverx.online</a>. Include your registered account details, transaction reference, payment date, and a brief explanation of the issue. Never send your password or one-time security codes.</p></section>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs leading-5 text-muted-foreground">By purchasing a plan, you acknowledge that you have read and understood this Refund Policy, subject to any non-waivable rights under applicable law.</div>
        <footer className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground"><Link to="/" className="hover:text-foreground">Home</Link><Link to="/terms" className="hover:text-foreground">Terms &amp; Conditions</Link><Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link><Link to="/earnings-disclaimer" className="hover:text-foreground">Earnings Disclaimer</Link><a href="mailto:support@adverx.online" className="hover:text-foreground">Contact Support</a></footer>
      </section>
    </main>
  );
}
