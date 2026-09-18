import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { SupportTicketPanel } from "@/components/SupportTicketPanel";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "Support — AdverX" }] }),
  component: SupportPage,
});

function SupportPage() {
  return <AppShell title="Support" subtitle="Get help from the AdverX team"><SupportTicketPanel /></AppShell>;
}
