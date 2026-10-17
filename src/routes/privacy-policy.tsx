import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | AdverX" },
      { name: "description", content: "Learn how AdverX handles account information, activity records, payment details, and privacy requests." },
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
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
        <p className="mt-4 text-sm text-muted-foreground">Last updated: October 17, 2026</p>

        <div className="mt-8 rounded-2xl border border-border bg-muted/30 p-5 sm:p-6"><h2 className="text-lg font-semibold">Your information matters</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">This policy explains the types of information AdverX may process to operate accounts, verify tasks and transactions, provide support, and protect the platform. The exact information depends on the features you use.</p></div>
        <div className="mt-8 space-y-7 text-sm leading-7 text-muted-foreground">
          <section><h2 className="text-lg font-semibold text-foreground">1. Information we may collect</h2><p className="mt-2">Account and profile information such as your name, username, email or contact details, public account identifier, referral code, and account status; plan, task, reward, referral, wallet, deposit, and withdrawal records; payment references and the payment details you submit; support messages and attachments; and technical or security information such as device/browser details, session events, IP address, timestamps, and diagnostic logs where available.</p><p className="mt-2">Do not send passwords, one-time codes, or unnecessary sensitive documents to support.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">2. How information is used</h2><p className="mt-2">Information may be used to create and manage accounts, activate plans, record task and reward activity, attribute referrals, process and review deposits or withdrawals, respond to support requests, detect fraud or misuse, secure the service, maintain records, resolve disputes, improve reliability, and meet legal or payment-provider obligations.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">3. Legal basis and purpose limitation</h2><p className="mt-2">Where applicable law requires a legal basis, processing may be based on providing the service you request, complying with legal obligations, protecting legitimate platform and user interests, or consent where consent is required. We aim to use information for relevant purposes and not collect more than is reasonably needed for them.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">4. When information may be shared</h2><p className="mt-2">Information may be shared with authorised staff and service providers that help operate hosting, authentication, customer support, security, communications, or payment workflows; with payment providers when needed to investigate or process a transaction; or with authorities and other parties when required by law, to protect rights and safety, or to investigate suspected fraud. We do not publish private account details as a public profile unless a feature clearly makes that information public or you choose to share it.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">5. Cookies, sessions, and device storage</h2><p className="mt-2">The service may use cookies or similar browser storage to maintain login sessions, remember essential settings, protect accounts, and keep the website working. Blocking essential storage may affect sign-in or other features. If optional analytics or other technologies are enabled, their use should be described and any required consent obtained under applicable law.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">6. Retention and security</h2><p className="mt-2">Information is retained for as long as reasonably needed for account operation, transaction and audit history, security, dispute resolution, and legal obligations. Retention periods can differ by record type. We use reasonable administrative and technical safeguards, but no online service or transmission method can be guaranteed completely secure.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">7. Your choices and requests</h2><p className="mt-2">You can review or update available profile information through account settings and contact support to ask about access, correction, deletion, or other privacy rights available under applicable law. Some transaction, security, or legally required records may need to be retained. We may need to verify your identity before acting on a request.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">8. International processing and third parties</h2><p className="mt-2">Service providers may process information in locations different from yours. Where required, appropriate safeguards should be used for cross-border processing. External websites and services have their own privacy policies; review them before providing information directly to them.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">9. Children</h2><p className="mt-2">AdverX is not intended for children who are not legally eligible to use the service. If you believe a child has provided personal information inappropriately, contact support so the matter can be reviewed.</p></section>
          <section><h2 className="text-lg font-semibold text-foreground">10. Policy changes and contact</h2><p className="mt-2">We may update this policy when our service or legal requirements change. The current version and update date will appear here. For privacy questions or requests, email support@adverx.online.</p></section>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-xs leading-5 text-muted-foreground">For questions about this policy, contact <a className="font-medium text-primary underline underline-offset-4" href="mailto:support@adverx.online">support@adverx.online</a>. This policy does not limit rights that cannot legally be waived under applicable law.</div>
        <footer className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-xs text-muted-foreground"><Link to="/" className="hover:text-foreground">Home</Link><Link to="/refund-policy" className="hover:text-foreground">Refund Policy</Link><Link to="/terms" className="hover:text-foreground">Terms &amp; Conditions</Link><Link to="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link><Link to="/earnings-disclaimer" className="hover:text-foreground">Earnings Disclaimer</Link></footer>
      </section>
    </main>
  );
}
