import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { usePlatform } from "@/lib/platform-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or create account — AdNet Rewards" },
      {
        name: "description",
        content:
          "Create your AdNet Rewards account, activate a plan and start completing daily ad tasks.",
      },
      { property: "og:title", content: "Sign in or create account — AdNet Rewards" },
      {
        property: "og:description",
        content: "Create an account, activate a plan and start earning from daily ad tasks.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { register, login, state, ready } = usePlatform();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    referral: "",
    terms: false,
  });

  useEffect(() => {
    if (ready && state.user) navigate({ to: "/", replace: true });
  }, [ready, state.user, navigate]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-5 py-10">
      <div className="brand-panel mb-6 p-6">
        <p className="text-xs uppercase tracking-widest opacity-80">AdNet Rewards</p>
        <h1 className="mt-2 text-2xl font-semibold leading-snug">
          Complete daily ad tasks. Grow your network. Withdraw your earnings.
        </h1>
        <p className="mt-2 text-sm opacity-85">
          Activate a plan, complete verified tasks and request payouts once you reach the
          minimum threshold.
        </p>
      </div>

      <Tabs defaultValue="register" className="surface p-5">
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
              placeholder="AHMED24"
            />
          </Field>
          <label className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
            <Checkbox
              checked={form.terms}
              onCheckedChange={(v) => setForm({ ...form, terms: v === true })}
            />
            <span>
              I accept the terms of service. Rewards depend on available tasks and platform
              capacity and are not a guaranteed return.
            </span>
          </label>
          <Button
            className="mt-2 w-full"
            onClick={() => {
              if (!form.fullName || !form.username || !form.email) {
                toast.error("Please fill in name, username and contact.");
                return;
              }
              if (!form.terms) {
                toast.error("Please accept the terms to continue.");
                return;
              }
              register({
                fullName: form.fullName,
                username: form.username,
                email: form.email,
                ...(form.referral ? { referredBy: form.referral } : {}),
              });
              navigate({ to: "/", replace: true });
            }}
          >
            Create account
          </Button>
        </TabsContent>

        <TabsContent value="login" className="mt-5 space-y-3">
          <Field label="Username">
            <Input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="ahmedraza"
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
          <Button
            className="w-full"
            onClick={() => {
              if (!form.username) {
                toast.error("Enter your username.");
                return;
              }
              login(form.username);
              navigate({ to: "/" });
            }}
          >
            Sign in
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Demo mode — any username works.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
