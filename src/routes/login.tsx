import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/routes/auth";

export const Route = createFileRoute("/login")({
  validateSearch: (search) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : "/",
    mode: "login" as const,
  }),
  head: () => ({
    links: [{ rel: "canonical", href: "https://adverx.online/login" }],
    meta: [
      { title: "Login to AdverX" },
      {
        name: "description",
        content:
          "Login to your AdverX account to access your workspace, daily ad tasks, rewards and withdrawals.",
      },
      { property: "og:title", content: "Login to AdverX" },
      {
        property: "og:description",
        content: "Securely sign in to your AdverX workspace.",
      },
    ],
  }),
  component: AuthPage,
});
