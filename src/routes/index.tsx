import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingUp,
  ShieldCheck,
  Wallet,
  ListChecks,
  Network,
  ReceiptText,
  ChevronDown,
  CreditCard,
  CircleDollarSign,
  Linkedin,
  Twitter,
  Facebook,
  Maximize2,
} from "lucide-react";

import { AppShell, StatTile } from "@/components/AppShell";
import { LoadingIndicator } from "@/components/LoadingIndicator";
import { BrandLogo } from "@/components/BrandLogo";
import { HeroTrustStrip, HomepageTrustStrip, useHomepageHero } from "@/components/HomepageHeroSettings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { money, PLANS, PUBLIC_MIN_WITHDRAWAL, WITHDRAWAL_METHODS, usePlatform } from "@/lib/platform-store";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import "@/morphic-dashboard.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AdverX â€” Complete tasks. Earn rewards. Track everything." },
      {
        name: "description",
        content:
          "A simple rewards workspace for verified ad tasks, wallet tracking, network activity, and withdrawals.",
      },
      { property: "og:title", content: "AdverX" },
      {
        property: "og:description",
        content:
          "Complete verified tasks, monitor your rewards, and mana¶»§q«^