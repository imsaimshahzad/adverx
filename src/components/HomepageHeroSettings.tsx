import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export type HomepageHeroConfig = {
  headline: string;
  subtext: string;
  ctaText: string;
  ctaLink: string;
  backgroundUrl: string;
  testimonials: string;
  stats: {
    members: { title: string; source: "members"; visible: boolean };
    rewards: { title: string; source: "rewards"; visible: boolean };
    withdrawalTime: {
      title: string;
      source: "withdrawal_time";
      visible: boolean;
    };
  };
};
export const defaultHomepageHero: HomepageHeroConfig = {
  headline: "Complete tasks. Earn rewards. Track everything.",
  subtext:
    "A simple rewards workspace where you can complete verified ad tasks, monitor your earnings, manage your network, and request withdrawals.",
  ctaText: "Start Earning Now",
  ctaLink: "/auth",
  backgroundUrl: "",
  testimonials: JSON.stringify([
    {
      name: "Ayesha Khan",
      quote: "The dashboard makes every reward easy to understand.",
    },
    {
      name: "Bilal Ahmed",
      quote: "I can track tasks and withdrawals without confusion.",
    },
  ]),
  stats: {
    members: {
      title: "Members in the workspace",
      source: "members",
      visible: t¶»§q«^