import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Home,
  MonitorPlay,
  Users,
  Wallet,
  LifeBuoy,
  History,
  Menu,
  Moon,
  Sun,
  BadgeCheck,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { usePlatform } from "@/lib/platform-store";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/LoadingIndicator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/BrandLogo";
import "@/dashboard-design.css";
import "@/morphic-system.css";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: Home }],
  },
  {
    label: "Earn & manage",
    items: [
      { to: "/ads", label: "Ad Tasks", icon: MonitorPlay },
      { to: "/plans", label: "Plans", icon: BadgeCheck },
      { to: "/network", label: "Referrals", icon: Users },
    ],
  },
  {
    label: "Finance",
    items: [{ to: "/withdraw", label: "Withdrawals", icon: Wallet }, { to: "/history", label: "Transaction History", icon: History }],
  },
  {
    label: "Support",
    items: [{ to: "/support", label: "Support", icon: LifeBuoy }, { to: "/profile", label: "Profile", icon: BadgeCheck }],
  },
] satisfies Array<{ label: string; items: { to: string; label: string; icon: LucideIcon }[] }>;

export function AppShell({
  title,
  subtitle,
  children,
  requireAuth = true,
  hideW¶»§q«^