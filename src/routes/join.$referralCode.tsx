import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Link2 } from "lucide-react";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { Button } from "@/components/ui/button";
import { saveReferralAttribution, validateReferralCode } from "@/lib/referrals";

export const Route = createFileRoute("/join/$referralCode")({
  component: JoinReferralPage,
});

function JoinReferralPage() {
  const { referralCode } = Route.useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "error">("loading");
  const [name, setName] = useState("");

  useEffect(() => {
    let active = true;
    void validateReferralCode(referralCode).then((referrer) => {
      if (!active) return;
      if (!referrer) {
        setStatus("invalid");
        return;
      }
      saveReferralAttribution(referrer.referral_code);
      setName(referrer.full_name || "a member");
      setStatus("valid");
    }).catch((error) => {
      console.error("[v0] Referral validation failed", error);
      if (active) setStatus("error");
    });
    return () => { active = false; };
  }, [referralCode]);

  if (status === "loading") {
    return <main className="flex min-h-screen items-center justify-center"><LoadingIndicator size="md" label="Validating referral link" /></main>;
  }

  if (status === "invalid" || status === "error") {
    const isVerificationError = status === "error";
    return <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center"><Link2 className="size-8 text-muted-foreground" /><h1 className="text-2xl font-semibold">{isVerificationError ? "Referral code could not be verified." : "Referral link is invalid or expired."}</h1><p className="text-sm text-muted-foreground">{isVerificationError ? "The referral service is temporarily unavailable. You can still create an account without a referral link." : "Ask your contact for a current referral link."}</p><Button asChild><Link to="/auth">Continue to sign up</Link></Button></main>;
  }

  return <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 px-6 text-center"><div className="brand-panel w-full p-6"><p className="text-xs uppercase tracking-widest opacity-80">AdverX</p><h1 className="mt-2 text-3xl font-semibold">You&apos;re invited by {name}</h1><p className="mt-2 text-sm opacity-85">Create your account and your network relationship will be registered immediately.</p></div><Button className="w-full" onClick={() => navigate({ to: "/auth", replace: false })}>Create account <ArrowRight className="size-4" /></Button></main>;
}
