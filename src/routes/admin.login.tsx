import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isImpersonating, supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/admin/login")({
  validateSearch: (search) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/admin",
  }),
  head: () => ({
    meta: [
      { title: "Admin login — AdverX" },
      { name: "description", content: "Secure administrator sign in for AdverX." },
    ],
  }),
  component: AdminLoginPage,
});

type LoginStep = "credentials" | "challenge" | "enroll";

function AdminLoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<LoginStep>("credentials");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [trustThisDevice, setTrustThisDevice] = useState(false);

  function continueToAdmin() {
    try {
      const target = new URL(redirect || "/admin", window.location.origin);
      if (target.origin !== window.location.origin) {
        window.location.replace("/admin");
      } else {
        window.location.replace(target.pathname + target.search + target.hash);
      }
    } catch {
      navigate({ to: "/admin", replace: true });
    }
  }

  async function beginMfa() {
    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError) throw assuranceError;
    if (assurance.currentLevel === "aal2") {
      continueToAdmin();
      return;
    }

    // A trusted device is accepted only after the server checks its HttpOnly
    // cookie against a non-reversible token hash stored in the database.
    try {
      const { data: currentSession } = await supabase.auth.getSession();
      if (currentSession.session?.access_token) {
        const trustedResponse = await fetch("/api/admin/trusted-device", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentSession.session.access_token}`,
          },
          body: JSON.stringify({ action: "validate" }),
        });
        if (trustedResponse.ok) {
          const trustedResult = await trustedResponse.json();
          if (trustedResult.trusted === true) {
            continueToAdmin();
            return;
          }
        }
      }
    } catch {
      // A temporary trust-check failure falls back to normal TOTP verification.
    }

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
    if (factorsError) throw factorsError;
    const verified = factors.totp.find((factor) => factor.status === "verified");
    if (verified) {
      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: verified.id });
      if (challengeError) throw challengeError;
      setFactorId(verified.id);
      setChallengeId(challenge.id);
      setStep("challenge");
      setCode("");
      return;
    }

    // Remove abandoned, unverified setup attempts. If Supabase refuses to
    // remove an old pending factor, use a distinct setup label so enrollment
    // can still proceed instead of trapping the owner on the credentials page.
    let canReuseFriendlyName = true;
    for (const factor of factors.totp) {
      if (factor.status !== "verified") {
        const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
        if (unenrollError) canReuseFriendlyName = false;
      }
    }
    const { data: enrollment, error: enrollmentError } =
      await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: canReuseFriendlyName ? "AdverX Admin" : "AdverX Admin Setup",
      });
    if (enrollmentError) throw enrollmentError;
    setFactorId(enrollment.id);
    setQrCode(enrollment.totp.qr_code);
    setSecret(enrollment.totp.secret);
    setStep("enroll");
    setCode("");
  }

  async function cancelLoginFlow() {
    // An unfinished MFA enrollment must not leave a usable admin session behind.
    if (step === "enroll" && factorId) {
      try {
        await supabase.auth.mfa.unenroll({ factorId });
      } catch {
        // Continue clearing the local session even if cleanup of a pending factor fails.
      }
    }
    try {
      await supabase.auth.signOut({ scope: "local" });
    } finally {
      setCode("");
      setFactorId("");
      setChallengeId("");
      setQrCode("");
      setSecret("");
      setStep("credentials");
      setPassword("");
      setError(null);
    }
  }

  useEffect(() => {
    if (step === "credentials") return;
    const handleBackNavigation = () => {
      void cancelLoginFlow();
    };
    window.addEventListener("popstate", handleBackNavigation);
    return () => window.removeEventListener("popstate", handleBackNavigation);
  }, [step, factorId]);

  async function signIn() {
    if (isImpersonating()) {
      setError("Admin login is disabled while viewing as another user.");
      return;
    }
    if (!email.trim() || !password) {
      toast.error("Enter your admin email and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;

      const { data: auth, error: userError } = await supabase.auth.getUser();
      if (userError || !auth.user) throw new Error("We could not verify your session. Please try again.");

      const { data: profile, error: profileError } = await (supabase as any)
        .from("profiles")
        .select("role")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (profileError) throw new Error("We could not verify your admin role. Please try again.");
      if (!["admin", "super_admin", "moderator"].includes(profile?.role)) {
        await supabase.auth.signOut();
        throw new Error("This account is not authorized to access the admin panel.");
      }
      await beginMfa();
    } catch (cause) {
      // If credentials were accepted but MFA could not start, revoke this local session.
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // Keep the original, user-facing authentication error.
      }
      setError(cause instanceof Error ? cause.message : "Unable to sign in securely. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      let activeChallengeId = challengeId;
      if (step === "enroll") {
        const { data: challenge, error: challengeError } =
          await supabase.auth.mfa.challenge({ factorId });
        if (challengeError) throw challengeError;
        activeChallengeId = challenge.id;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: activeChallengeId,
        code: code.trim(),
      });
      if (verifyError) throw new Error("That code is incorrect or expired. Check your phone and try again.");
      if (step === "enroll") {
        toast.success("Two-factor authentication enabled.");
      }
      if (trustThisDevice) {
        try {
          const { data: currentSession } = await supabase.auth.getSession();
          if (!currentSession.session?.access_token) throw new Error("Missing verified session");
          const trustResponse = await fetch("/api/admin/trusted-device", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentSession.session.access_token}`,
            },
            body: JSON.stringify({ action: "issue" }),
          });
          if (!trustResponse.ok) throw new Error("Trusted device registration failed");
          toast.success("This device is trusted for 30 days.");
        } catch {
          toast.error("2FA succeeded, but this device could not be trusted. You can still continue securely.");
        }
      }
      continueToAdmin();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to verify the code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="surface w-full max-w-md p-6 shadow-sm">
        <BrandLogo className="mb-5 max-w-[11.5rem] rounded bg-white p-2 sm:max-w-[15.75rem]" />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">AdverX Security</p>
        <h1 className="mt-3 text-2xl font-semibold">
          {step === "credentials" ? "Admin sign in" : step === "enroll" ? "Set up two-factor authentication" : "Verify your login"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "credentials"
            ? "Enter your existing admin email and password. New devices must verify with your authenticator app."
            : step === "enroll"
              ? "Scan this QR code with Google Authenticator, Microsoft Authenticator, or another TOTP app, then enter its 6-digit code."
              : "Open your authenticator app and enter the current 6-digit code to finish signing in."}
        </p>
        {error ? <p role="alert" className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}
        {step === "credentials" ? (
          <div className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Email</Label>
              <Input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@mail.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <Input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229) void signIn(); }} />
            </div>
            <label className="flex items-start gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-border accent-primary"
                checked={trustThisDevice}
                onChange={(event) => setTrustThisDevice(event.target.checked)}
              />
              <span>
                <span className="font-medium text-foreground">Trust this device for 30 days</span>
                <span className="block text-xs">Only select this on your personal device. You will still need your password.</span>
              </span>
            </label>
            <Button className="w-full" disabled={submitting} onClick={() => void signIn()}>
              {submitting ? "Checking…" : "Continue securely"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-sm"
              disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  const response = await fetch("/api/admin/trusted-device", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "revoke" }),
                  });
                  if (!response.ok) throw new Error("Unable to forget this device.");
                  toast.success("This browser's trusted-device access has been revoked.");
                } catch {
                  toast.error("Unable to forget this device. Please try again.");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              Forget this trusted device
            </Button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {step === "enroll" ? (
              <div className="space-y-3 rounded-lg border border-border p-4">
                {qrCode ? <img src={qrCode.startsWith("data:") ? qrCode : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrCode)}`} alt="Authenticator setup QR code" className="mx-auto h-52 w-52 max-w-full" /> : null}
                <p className="text-xs text-muted-foreground">Agar QR scan nahi hota to authenticator app mein yeh setup key manually enter karein:</p>
                <p className="break-all rounded bg-muted p-2 font-mono text-sm select-all">{secret}</p>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="admin-2fa-code">6-digit authenticator code</Label>
              <Input id="admin-2fa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} onKeyDown={(event) => { if (event.key === "Enter") void verifyCode(); }} placeholder="000000" />
            </div>
            <Button className="w-full" disabled={submitting || code.length !== 6} onClick={() => void verifyCode()}>
              {submitting ? "Verifying…" : step === "enroll" ? "Enable 2FA and continue" : "Verify and sign in"}
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={submitting} onClick={() => void cancelLoginFlow()}>
              Cancel setup and sign out
            </Button>
            <p className="text-center text-xs text-muted-foreground">Code sirf login par chahiye hoga, har admin action par nahi.</p>
          </div>
        )}
      </section>
    </main>
  );
}
