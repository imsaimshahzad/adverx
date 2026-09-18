import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/routes/auth";

export const Route = createFileRoute("/signup")({
  component: AuthPage,
});
