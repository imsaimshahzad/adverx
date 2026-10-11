import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { money, PLANS, usePlatform } from "@/lib/platform-store";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    links: [{ rel: "canonical", href: "https://adverx.online/plans" }],
    meta: [
      { title: "AdverX Plans â€” Choose Your Reward Plan" },
      {
        name: "description",
        content:
          "Explore AdverX plans, daily ad task limits, referral rewards and withdrawal eligibility.",
      },
      {
        property: "og:title",
        content: "AdverX Plans â€” Choose Your Reward Plan",
      },
      {
        property: "og:description",
        content:
          "Explore AdverX plans, daily ad task limits, referral rewards and withdrawal eligibility.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",¶»§q«^