import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/$")({
  component: AdminPathRoute,
});

function AdminPathRoute() {
  return null;
}
