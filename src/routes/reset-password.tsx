import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INVALID_LINK_MESSAGE =
  "This password reset link is invalid or has expired. Please request a new one.";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password — AdverX" },
      {
        name: "description",
        content: "Securely reset your AdverX password.",
      },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const initializeRecovery = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        setReady(true);
        return;
      }
      setInvalidLink(true);
    };

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;
        if (event === "PASSWORD_RECOVERY" && session) {
          setInvalidLink(false);
          setReady(true);
        }
      },
    );

    void initializeRecovery();
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async () => {
    if (password.length < 8) {
      toast.error("Your password must be at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      toast.error("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setInvalidLink(true);
      return;
    }

    await supabase.auth.signOut();
    toast.success("Your password has been updated. You can now sign in.");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-10">
      <section className="surface space-y-5 p-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            AdverX
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Reset your password</h1>
        </div>

        {invalidLink ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {INVALID_LINK_MESSAGE}
            </p>
            <Button
              className="w-full"
              onClick={() => navigate({ to: "/auth" })}
            >
              Request New Reset Link
            </Button>
          </div>
        ) : !ready ? (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
            <LoadingIndicator size="md" label="Verifying reset link" />
            <span>Verifying your reset link</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={submitting}
              onClick={() => void updatePassword()}
            >
              Update password
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
