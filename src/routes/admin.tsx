import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
  redirect,
} from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  Bell,
  Copy,
  Eye,
  Inbox,
  Mail,
  Sparkles,
  BookOpen,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Flag,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  RefreshCw,
  ReceiptText,
  Search,
  Filter,
  X,
  Settings,
  ShieldCheck,
  TrendingUp,
  Users,
  WalletCards,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingButtonContent, LoadingIndicator, LoadingScreen } from "@/components/LoadingIndicator";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminPushNotifications } from "@/components/AdminPushNotifications";
import { HomepageHeroSettings } from "@/components/HomepageHeroSettings";
import { SupportTicketPanel } from "@/components/SupportTicketPanel";
import { AdminEmailComposer } from "@/components/Admi¶»§q«^