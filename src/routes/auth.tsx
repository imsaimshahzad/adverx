import { createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isImpersonating, supabase } from "@/integrations/supabase/client";
import { loginSchema, resetRequestSchema } from "@/lib/input-validation";

import { usePlatform } from "@/lib/platform-store";
import {
  captureReferralFromLocation,
  clearReferralAttribution,
  validateReferralCode,
} from "@/lib/referrals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/",
  }),
  head: () => ({
    meta: [
      { title: "Sign in or create account — AdverX" },
      {
        name: "description",
        content:
          "Create your AdverX account, activate a plan and start completing daily ad tasks.",
      },
      {
        property: "og:title",
        content: "Sign in or create account — AdverX",
      },
      {
        property: "og:description",
        content:
          "Create an account, activate a plan and start earning from daily ad tasks.",
      },
    ],
  }),
  component: AuthPage,
});

export function AuthPage() {
  const { state, ready, dataError, logout } = usePlatform();
  const navigate = useNavigate();
  const location = useLocation();
  const redirect = typeof location.search?.redirect === "string" ? location.search.redirect : "/";
  const pathMode = location.pathname === "/login" ? "login" : location.pathname === "/signup" ? "register" : "register";
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    referral: "",
    terms: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({});
  const [signupError, setSignupError] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetRequested, setResetRequested] = useState(false);

  useEffect(() => {
    // Admin "Login as User" must not create an IP activity record for the target user.
    // The impersonation session is not a real sign-in by that user.
    if (isImpersonating() || !ready || !state.user) return;

    // Record one IP-derived access signal per signed-in user per browser session.
    // This is best-effort and must never block login or redirect.
    void (async () => {
      try {
        const key = `adverx-access-signal:${state.user!.id}`;
        if (sessionStorage.getItem(key) === "1") return;
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;
        if (!accessToken) return;
        const response = await fetch("/api/access-signal", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (response.ok) sessionStorage.setItem(key, "1");
      } catch {
        // Fraud telemetry is non-critical; authentication must continue normally.
      }
    })();

    try {
      const target = new URL(redirect || "/", window.location.origin);
      if (target.origin !== window.location.origin) {
        window.location.replace("/");
        return;
      }
      window.location.replace(target.pathname + target.search + target.hash);
    } catch {
      navigate({ to: "/", replace: true });
    }
  }, [ready, state.user, redirect, navigate]);

  useEffect(() => {
    const referralCodeFromLink = captureReferralFromLocation();
    if (referralCodeFromLink) {
      setForm((current) => ({ ...current, referral: referralCodeFromLink }));
    }
  }, []);

  return (
    <main className="auth-page flex min-h-screen w-full flex-col items-center justify-center bg-background px-4 py-8 sm:px-5">
      <style>{`.auth-page .auth-card{box-shadow:0 8px 30px rgba(20,23,54,.08)}.auth-page .auth-control{min-height:52px;border-radius:10px}.auth-page .auth-tabs [data-state=active]{background:var(--primary);color:var(--primary-foreground)}.auth-page h1{line-height:1.2}.auth-page label{font-size:13px}.auth-page .auth-card button:focus-visible{outline-offset:2px}`}</style>
      <BrandLogo className="mb-5 w-full max-w-[11.5rem] rounded bg-white p-2 sm:max-w-[15.75rem]" />
      <div className="mx-auto flex w-full max-w-[440px] flex-col justify-center">
      {!ready ? <p className="mb-3 text-center text-sm text-muted-foreground">Checking your session…</p> : null}
      {ready && dataError && !state.user ? <p role="alert" className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">Authentication succeeded, but your profile could not be loaded: {dataError}</p> : null}
      <Tabs defaultValue={pathMode} className="auth-card min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-[22px]">
        <TabsList className="auth-tabs mb-5 grid h-12 w-full min-w-0 grid-cols-2 gap-1 rounded-xl border border-border bg-secondary/50 p-1">
          <TabsTrigger value="register" className="min-w-0 truncate rounded-lg px-2 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">Create account</TabsTrigger>
          <TabsTrigger value="login" className="min-w-0 truncate rounded-lg px-2 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm">Sign in</TabsTrigger>
        </TabsList>
        <TabsContent value="register" className="mt-0 space-y-3.5">
          <h1 className="mb-5 text-[22px] font-extrabold tracking-tight text-foreground">Create your AdverX account</h1>
          <Field label="Full name">
            <Input
              value={form.fullName}
              onChange={(e) => {
                setForm({ ...form, fullName: e.target.value });
                setSignupErrors((current) => ({ ...current, fullName: "" }));
                setSignupError("");
              }}
              placeholder="Ahmed Raza"
              aria-invalid={Boolean(signupErrors.fullName)}
            />
          </Field>
          {signupErrors.fullName ? <p role="alert" className="-mt-2 text-xs text-destructive">{signupErrors.fullName}</p> : null}
          <Field label="Username">
            <Input
              value={form.username}
              onChange={(e) => {
                setForm({ ...form, username: e.target.value });
                setSignupErrors((current) => ({ ...current, username: "" }));
                setSignupError("");
              }}
              placeholder="ahmedraza"
              aria-invalid={Boolean(signupErrors.username)}
            />
          </Field>
          {signupErrors.username ? <p role="alert" className="-mt-2 text-xs text-destructive">{signupErrors.username}</p> : <p className="-mt-2 text-xs text-muted-foreground">3–24 characters; use letters, numbers, and underscores only.</p>}
          <Field label="Email or phone">
            <Input
              value={form.email}
              onChange={(e) => {
                setForm({ ...form, email: e.target.value });
                setSignupErrors((current) => ({ ...current, email: "" }));
                setSignupError("");
              }}
              placeholder="ahmed@example.com"
              aria-invalid={Boolean(signupErrors.email)}
            />
          </Field>
          {signupErrors.email ? <p role="alert" className="-mt-2 text-xs text-destructive">{signupErrors.email}</p> : null}
          <Field label="Password">
            <div className="relative">
              <Input
                className="auth-control w-full rounded-[10px] border-[1.5px] border-input bg-secondary/50 px-3 py-3 pr-16 shadow-sm placeholder:text-muted-foreground focus-visible:ring-2"
                type={showSignupPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  setSignupErrors((current) => ({ ...current, password: "" }));
                  setSignupError("");
                }}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                aria-invalid={Boolean(signupErrors.password)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                onClick={() => setShowSignupPassword((visible) => !visible)}
                aria-label={showSignupPassword ? "Hide password" : "Show password"}
                aria-pressed={showSignupPassword}
              >
                {showSignupPassword ? "Hide" : "Show"}
              </button>
            </div>
          </Field>
          {form.password.length > 0 && (
            <div className="-mt-2 space-y-1 text-xs text-muted-foreground" aria-live="polite">
              {[
                { label: "At least 8 characters", valid: form.password.length >= 8 },
                { label: "At least one uppercase letter", valid: /[A-Z]/.test(form.password) },
                { label: "At least one lowercase letter", valid: /[a-z]/.test(form.password) },
                { label: "At least one number", valid: /[0-9]/.test(form.password) },
                { label: "At least one special character", valid: /[^A-Za-z0-9]/.test(form.password) },
              ].filter((rule) => !rule.valid).map((rule) => (
                <p key={rule.label}>Missing: {rule.label}</p>
              ))}
            </div>
          )}
          {signupErrors.password ? <p role="alert" className="-mt-2 text-xs text-destructive">{signupErrors.password}</p> : null}
          <Field label="Referral code (optional)">
            <Input
              value={form.referral}
              onChange={(e) => setForm({ ...form, referral: e.target.value })}
              placeholder="Enter referral code (optional)"
            />
          </Field>
          <label className="flex w-full min-w-0 items-start gap-2 rounded-lg py-1 text-xs leading-5 text-muted-foreground">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.checked })}
              className="mt-1 size-4 shrink-0 accent-primary"
            />
            <span className="min-w-0">
              I accept the terms of service. Rewards depend on available tasks and
              platform capacity and are not a guaranteed return.
            </span>
          </label>
          {signupError ? <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{signupError}</p> : null}
          <Button
            className="mt-2 w-full"
            disabled={submitting}
            onClick={() => {
              const nextErrors: Record<string, string> = {};
              if (!form.fullName.trim()) nextErrors.fullName = "Enter your full name.";
              const username = form.username.trim();
              if (!username) nextErrors.username = "Choose a username.";
              else if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) nextErrors.username = "Username must be 3–24 characters and contain only letters, numbers, or underscores.";
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = "Enter a valid email address.";
              if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/[a-z]/.test(form.password) || !/[0-9]/.test(form.password) || !/[^A-Za-z0-9]/.test(form.password)) nextErrors.password = "Use at least 8 characters with an uppercase letter, a lowercase letter, a number, and a special character.";
              setSignupErrors(nextErrors);
              setSignupError("");
              if (Object.values(nextErrors).some(Boolean)) {
                toast.error("Please fix the highlighted fields.");
                return;
              }
              if (!form.terms) {
                toast.error("Please accept the terms to continue.");
                return;
              }
              setSubmitting(true);
              void (async () => {
                try {
                  const referral = form.referral.trim().toUpperCase();
                  if (referral) {
                    const referrer = await validateReferralCode(referral);
                    if (!referrer) {
                      toast.error("That referral code is invalid.");
                      return;
                    }
                  }
                  const { data, error } = await supabase.auth.signUp({
                    email: form.email,
                    password: form.password,
                    options: {
                      data: {
                        full_name: form.fullName.trim(),
                        username: form.username.trim(),
                        referral_code: referral || null,
                      },
                    },
                  });
                  if (error) {
                    console.error("[AdverX] signup failed", { code: error.code, message: error.message, status: error.status });
                    const message = getSignupErrorMessage(error.message, error.code);
                    if (message.field === "username") {
                      setSignupErrors((current) => ({ ...current, username: message.text }));
                    } else if (message.field === "email") {
                      setSignupErrors((current) => ({ ...current, email: message.text }));
                    } else if (message.field === "password") {
                      setSignupErrors((current) => ({ ...current, password: message.text }));
                    } else {
                      setSignupError(message.text);
                    }
                    toast.error(message.text);
                    return;
                  }
                  if (!data.user) {
                    toast.error("Supabase did not create the account. Please try again.");
                    return;
                  }
                  clearReferralAttribution();
                  toast.success(data.session ? "Account created successfully." : "Account created. Check your email to confirm before signing in.");
                  if (data.session) navigate({ to: "/", replace: true });
                } catch (error) {
                  console.error("[AdverX] signup flow failed", error);
                  const message = error instanceof Error && /fetch|network|load failed/i.test(error.message)
                    ? "Network issue. Check your connection and try again."
                    : "We couldn't finish creating your account. Please try again. If the problem continues, contact support.";
                  setSignupError(message);
                  toast.error(message);
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            Create account
          </Button>
        </TabsContent>

        <TabsContent value="login" className="mt-0 space-y-3.5">
          <h1 className="mb-5 text-[22px] font-extrabold tracking-tight text-foreground">Welcome back</h1>
          {state.user ? (
            <div className="glass-input flex flex-col gap-4 p-4 text-center">
              <div>
                <p className="text-sm font-medium">You are already signed in.</p>
                <p className="mt-1 text-xs text-muted-foreground">{state.user.email}</p>
              </div>
              <Button className="w-full" onClick={() => navigate({ to: "/", replace: true })}>Continue to dashboard</Button>
              <Button variant="outline" className="w-full" onClick={() => void logout()}>Sign out</Button>
            </div>
          ) : (
            <>
          <Field label="Your email">
            <Input
              className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2.5 shadow-sm placeholder:text-muted-foreground focus-visible:ring-2"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ahmed@example.com"
            />
          </Field>
          <Field label="Your password">
            <Input
              className="w-full rounded-md border border-input bg-secondary/50 px-3 py-2.5 shadow-sm placeholder:text-muted-foreground focus-visible:ring-2"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </Field>
          {showForgotPassword ? (
            <div className="glass-input flex flex-col gap-3 p-4">
              <div>
                <p className="text-sm font-medium">Reset your password</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter your account email and we&apos;ll send a secure reset
                  link.
                </p>
              </div>
              <Field label="Email">
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="ahmed@example.com"
                  autoComplete="email"
                />
              </Field>
              <Button
                className="w-full"
                disabled={submitting}
                onClick={() => {
                  if (!resetRequestSchema.safeParse({ email: resetEmail }).success) {
                    toast.error("Enter your email address.");
                    return;
                  }
                  setSubmitting(true);
          void supabase.auth
                  .resetPasswordForEmail(resetEmail.trim(), {
                    redirectTo: `https://adverx.online/reset-password`,
                  })
                    .then(({ error }) => {
                      setSubmitting(false);
                      if (error) {
                        console.error("[AdverX] password reset failed", error);
    toast.error("Unable to send the reset email. Please try again.");
                        return;
                      }
                      setResetRequested(true);
                    });
                }}
              >
                Send reset link
              </Button>
              {resetRequested && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  If an account exists for this email, a password reset link has
                  been sent.
                </p>
              )}
              <button
                type="button"
                className="w-full text-xs text-muted-foreground underline underline-offset-4"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetRequested(false);
                }}
              >
                Back to sign in
              </button>
            </div>
          ) : null}
          {!showForgotPassword && (
            <Button
              className="w-full"
              disabled={submitting}
              onClick={() => {
                const parsedLogin = loginSchema.safeParse({ email: form.email, password: form.password });
                if (!parsedLogin.success) {
                  toast.error("Enter your email and password.");
                  return;
                }
                setSubmitting(true);
                void supabase.auth
                  .signInWithPassword({
                    email: form.email,
                    password: form.password,
                  })
                  .then(({ error }) => {
                    setSubmitting(false);
                    if (error) {
                      console.error("[AdverX] sign-in failed", error);
    toast.error("Unable to sign in. Please check your credentials.");
                      return;
                    }
                    toast.success("Signed in. Loading your workspace…");
                  });
              }}
            >
              Sign in
            </Button>
          )}
          {!showForgotPassword && (
            <button
              type="button"
              className="w-full text-xs text-muted-foreground underline underline-offset-4"
              onClick={() => {
                setResetEmail(form.email);
                setShowForgotPassword(true);
                setResetRequested(false);
              }}
            >
              Forgot Password?
            </button>
          )}
          <p className="text-center text-xs text-muted-foreground">
            Use the account credentials associated with your verified profile.
          </p>
            </>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </main>
  );
}

function getSignupErrorMessage(rawMessage: string, code?: string): { text: string; field?: "username" | "email" | "password" } {
  const message = `${code ?? ""} ${rawMessage}`.toLowerCase();

  if (/username/.test(message) && /(already|taken|duplicate|unique|exists|registered|profiles_.*username)/.test(message)) {
    return { field: "username", text: "Username already taken. Please choose another username." };
  }
  if (/username/.test(message) && /(invalid|format|constraint|check)/.test(message)) {
    return { field: "username", text: "Username must be 3–24 characters and contain only letters, numbers, or underscores." };
  }
  if (/already registered|user already exists|email.*(already|exists|registered)/.test(message)) {
    return { field: "email", text: "An account with this email already exists. Sign in or use another email." };
  }
  if (/invalid email|email.*invalid/.test(message)) {
    return { field: "email", text: "Enter a valid email address." };
  }
  if (/password.*(weak|short|least|characters|contain)|weak password|password should/.test(message)) {
    return { field: "password", text: "This password was rejected by the account security policy. Use at least 8 characters with an uppercase letter, a lowercase letter, a number, and a special character." };
  }
  if (/rate limit|too many requests/.test(message)) {
    return { text: "Too many signup attempts. Please wait a few minutes and try again." };
  }
  if (/network|fetch failed|failed to fetch/.test(message)) {
    return { text: "Network issue. Check your connection and try again." };
  }
  if (/database error saving new user|error creating user|profile|trigger/.test(message)) {
    return { text: "Your account details were accepted, but account setup failed. Please try again later or contact support if it continues." };
  }
  return { text: "We couldn't create your account with these details. Check the highlighted fields and try again. If it continues, contact support." };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
