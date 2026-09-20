import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { usePlatform } from "@/lib/platform-store";
import { BrandLogo } from "@/components/BrandLogo";
import {
  captureReferralFromLocation,
  clearReferralAttribution,
  validateReferralCode,
} from "@/lib/referrals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const { redirect } = Route.useSearch();
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
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-10 sm:px-6">
      {!ready ? <p className="mb-3 text-center text-sm text-muted-foreground">Checking your session…</p> : null}
      {ready && dataError && !state.user ? <p role="alert" className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">Authentication succeeded, but your profile could not be loaded: {dataError}</p> : null}
      <div className="glass-panel mb-6 overflow-hidden bg-primary p-6 text-primary-foreground shadow-brand">
        <BrandLogo className="mb-5 max-w-[11.5rem] rounded bg-white/95 p-2 sm:max-w-[15.75rem]" />
        <p className="text-xs uppercase tracking-widest opacity-80">
          AdverX
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-snug">
          Complete daily ad tasks. Grow your network. Withdraw your earnings.
        </h1>
        <p className="mt-2 text-sm opacity-85">
          Activate a plan, complete verified tasks and request payouts once you
          reach the minimum threshold.
        </p>
      </div>

      <Tabs defaultValue="register" className="glass-panel p-5 sm:p-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="register">Create account</TabsTrigger>
          <TabsTrigger value="login">Sign in</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-5 space-y-3">
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
          <label className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
            <Checkbox
              checked={form.terms}
              onCheckedChange={(v) => setForm({ ...form, terms: v === true })}
            />
            <span>
              I accept the terms of service. Rewards depend on available tasks
              and platform capacity and are not a guaranteed return.
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
                    toast.error(error.message || "Unable to create account. Please check your details.");
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
                  toast.error(error instanceof Error ? error.message : "Unable to create your account.");
                } finally {
                  setSubmitting(false);
                }
              })();
            }}
          >
            Create account
          </Button>
        </TabsContent>

        <TabsContent value="login" className="mt-5 space-y-3">
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
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ahmed@example.com"
            />
          </Field>
          <Field label="Password">
            <Input
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
                  if (!resetEmail.trim()) {
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
                        toast.error(error.message || "Unable to send the reset email.");
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
                if (!form.email || !form.password) {
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
                      toast.error(error.message || "Unable to sign in. Please check your credentials.");
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
