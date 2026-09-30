import { createFileRoute, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { loginSchema, signupSchema, resetRequestSchema } from "@/lib/input-validation";

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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetRequested, setResetRequested] = useState(false);

  useEffect(() => {
    if (!ready || !state.user) return;

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
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              placeholder="Ahmed Raza"
            />
          </Field>
          <Field label="Username">
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="ahmedraza"
            />
          </Field>
          <Field label="Email or phone">
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ahmed@example.com"
            />
          </Field>
          <Field label="Password">
            <Input
              className="auth-control w-full rounded-[10px] border-[1.5px] border-input bg-secondary/50 px-3 py-3 shadow-sm placeholder:text-muted-foreground focus-visible:ring-2"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </Field>
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
          <Button
            className="mt-2 w-full"
            disabled={submitting}
            onClick={() => {
              if (
                !form.fullName ||
                !form.username ||
                !form.email ||
                form.password.length < 8
              ) {
                toast.error(
                  "Use a name, username, valid email, and password of at least 8 characters.",
                );
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
                        full_name: form.fullName,
                        username: form.username,
                        referral_code: referral || null,
                      },
                    },
                  });
                  if (error) {
                    console.error("[v0] Signup failed", error);
                    console.error("[AdverX] signup failed", error);
      toast.error("Unable to create your account. Please check your details.");
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
                  console.error("[v0] Signup request failed", error);
                  console.error("[AdverX] signup flow failed", error);
      toast.error("Unable to create your account. Please try again.");
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
