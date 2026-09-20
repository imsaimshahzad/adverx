import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
      {
        name: "description",
        content: "Secure administrator sign in for AdverX.",
      },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setSubmitting(false);
      setError(signInError.message || "Unable to sign in. Check your credentials.");
      return;
    }
    const { data: auth, error: userError } = await supabase.auth.getUser();
    if (userError || !auth.user) {
      setSubmitting(false);
      setError("We could not verify your session. Please try again.");
      return;
    }
    const { data: profile, error: profileError } = await (supabase as any)
      .from("profiles")
      .select("role")
      .eq("id", auth.user.id)
      .maybeSingle();
    if (profileError) {
      console.error("[v0] Admin profile lookup failed", profileError);
      setSubmitting(false);
      setError(`Signed in, but we could not load your profile: ${profileError.message}`);
      return;
    }
    if (!["admin", "super_admin", "moderator"].includes(profile?.role)) {
      setSubmitting(false);
      setError("This account is not authorized to access the admin panel.");
      return;
    }
    setSubmitting(false);
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <section className="surface w-full max-w-md p-6 shadow-sm">
        <BrandLogo className="mb-5 max-w-[11.5rem] rounded bg-white p-2 sm:max-w-[15.75rem]" />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          AdverX
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Admin sign in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Only authorized admin, moderator, and super-admin accounts can access this panel.
        </p>
        {error ? (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}
        <div className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@mail.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-password">Password</Label>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.nativeEvent.isComposing &&
                  event.keyCode !== 229
                )
                  void signIn();
              }}
            />
          </div>
          <Button
            className="w-full"
            disabled={submitting}
            onClick={() => void signIn()}
          >
            {submitting ? "Signing in…" : "Sign in to admin"}
          </Button>
        </div>
      </section>
    </main>
  );
}
