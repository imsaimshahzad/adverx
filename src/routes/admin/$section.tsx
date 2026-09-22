import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/$section")({
  ssr: false,
  component: AdminSectionRedirect,
});

function AdminSectionRedirect() {
  const { section } = Route.useParams();

  useEffect(() => {
    window.location.replace(`/admin?section=${encodeURIComponent(section)}`);
  }, [section]);

  return null;
}
