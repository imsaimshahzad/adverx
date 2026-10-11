"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Plus, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  subjectSchema,
  supportTextSchema,
  uuidSchema,
} from "@/lib/input-validation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const db = supabase as unknown;
const categories = [
  "Withdrawal Issue",
  "Task Not Credited",
  "Account Issue",
  "Referral Issue",
  "Other",
] as const;
const statuses = ["open", "in_progress", "resolved", "closed"] as const;
const priorities = ["low", "normal", "high", "urgent"] as const;

type Ticket = {
  id: string;
  user_id: string;
  user_name?: string | null;
  user_public_uid?: string | null;
  subject: string;
  description: string | null;
  message: string | null;
  category: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
};
type Message = {
  id: string;
  ticket_id: string;
  sender_type: "user" | "admin";
  message: string;
  created_at: string;
};

function statusClass(status: string) {
  return status === "open"
    ? "bg-amber-100 text-amber-800"
    : status === "resolved"
      ? "bg-emerald-100 text-emerald-800"
      : status === "closed"
        ? "bg-muted text-muted-foreground"
        : "bg-blue-100 text-blue-800";
}

export func¶»§q«^