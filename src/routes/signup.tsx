import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/routes/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://adverx.online/signup" }],
    meta: [
      { title: "Register for AdverX" },
      {
        name: "description",
        content:
          "Create your AdverX account to access daily ad tasks, rewards, referrals and withdrawals.",
      },
      { property: "og:title", content: "Register for AdverX" },
      {
        property: "og:description",
        content: "Create your AdverX account and access your reward workspace.",
      },
    ],
  }),
  component: AuthPage,
});
