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
import {
  LoadingButtonContent,
  LoadingIndicator,
  LoadingScreen,
} from "@/components/LoadingIndicator";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AdminPushNotifications } from "@/components/AdminPushNotifications";
import { HomepageHeroSettings } from "@/components/HomepageHeroSettings";
import { SupportTicketPanel } from "@/components/SupportTicketPanel";
import { AdminEmailComposer } from "@/componen¶»§q«^t€€€€€¤€è…Ñ¥Ù”€ôôô€‰É•Á½ÉÑÌˆ€ü€ (€€€€€€€€€€€€ñI•Á½ÉÑÍA…¹•°€¼ø(€€€€€€€€€€¤€è€ (€€€€€€€€€€€€ñ5½‘Õ±•Q…‰±”(€€€€€€€€€€€€€…Ñ¥Ù”õí…Ñ¥Ù•ô(€€€€€€€€€€€€€É½İÌõí™¥±Ñ•É•‘ô(€€€€€€€€€€€€€Ñ½Ñ…±I•½É‘Ìõí…Ñ¥Ù”€ôôô€‰ÕÍ•ÉÌˆ€üÕÍ•ÉQ½Ñ…°€èÕ¹‘•™¥¹•‘ô(€€€€€€€€€€€€€ÅÕ•ÉäõíÅÕ•Éåô(€€€€€€€€€€€€€Í•ÑEÕ•Éäõì¡Ù…±Õ”¤€ôøì(€€€€€€€€€€€€€€€Í•ÑEÕ•Éä¡Ù…±Õ”¤ì(€€€€€€€€€€€€€€€Í•ÑA…” Ä¤ì(€€€€€€€€€€€€€õô(€€€€€€€€€€€€€Á…”õíÁ…•ô(€€€€€€€€€€€€€Í•ÑA…”õíÍ•ÑA…•ô(€€€€€€€€€€€€€Í•±•Ñ•‘UÍ•ÈõíÍ•±•Ñ•‘UÍ•Éô(€€€€€€€€€€€€€Í•ÑM•±•Ñ•‘UÍ•ÈõíÍ•ÑM•±•Ñ•‘UÍ•Éô(€€€€€€€€€€€€€…Ñ¥½¹ÌõíÍÑ…ÑÕÍÑ¥½¹Ím…Ñ¥Ù•t€üümuô(€€€€€€€€€€€€€ÍÑ…ÑÕÍA…ÉÑ¥Ñ¥½¸õíÍÑ…ÑÕÍA…ÉÑ¥Ñ¥½¹ô(€€€€€€€€€€€€€ÕÍ•ÉA…ÉÑ¥Ñ¥½¸õíÕÍ•ÉA…ÉÑ¥Ñ¥½¹ô(€€€€€€€€€€€€€ÕÍ•É½Õ¹ÑÌõíÕÍ•É½Õ¹ÑÍô(€€€€€€€€€€€€€½¹UÍ•ÉA…ÉÑ¥Ñ¥½¸õì¡Ù…±Õ”¤€ôøì(€€€€€€€€€€€€€€€Í•ÑUÍ•ÉA…ÉÑ¥Ñ¥½¸¡Ù…±Õ”¤ì(€€€€€€€€€€€€€€€Í•ÑA…” Ä¤ì(€€€€€€€€€€€€€õô(€€€€€€€€€€€€€…‘Í¥±Ñ•Èõí…‘Í¥±Ñ•Éô(€€€€€€€€€€€€€½¹‘Í¥±Ñ•Èõì¡Ù…±Õ”¤€ôøì(€€€€€€€€€€€€€€€Í•Ñ‘Í¥±Ñ•È¡Ù…±Õ”¤ì(€€€€€€€€€€€€€€€Í•ÑA…” Ä¤ì(€€€€€€€€€€€€€õô(€€€€€€€€€€€€€ì¸¸¸¡…Ñ¥Ù”€ôôô€‰Ñ…Í­Ìˆ(€€€€€€€€€€€€€€€€üì(€€€€€€€€€€€€€€€€€€€…‘Í½Õ¹ÑÌèì(€€€€€€€€€€€€€€€€€€€€€…Ñ¥Ù”èÕÉÉ•¹ÑI½İÌ¹™¥±Ñ•È (€€€€€€€€€€€€€€€€€€€€€€€€¡É½Ü¤€ôø(€€€€€€€€€€€€€€€€€€€€€€€€€MÑÉ¥¹œ¡É½Ü¹ÍÑ…ÑÕÌ€üü€ˆˆ¤¹Ñ½1½İ•É…Í” ¤€ôôô€‰…Ñ¥Ù”ˆ°(€€€€€€€€€€€€€€€€€€€€€€¤¹±•¹Ñ °(€€€€€€€€€€€€€€€€€€€€€…É¡¥Ù•èÕÉÉ•¹ÑI½İÌ¹™¥±Ñ•È (€€€€€€€€€€€€€€€€€€€€€€€€¡É½Ü¤€ôø(€€€€€€€€€€€€€€€€€€€€€€€€€MÑÉ¥¹œ¡É½Ü¹ÍÑ…ÑÕÌ€üü€ˆˆ¤¹Ñ½1½İ•É…Í” ¤€ôôô€‰…É¡¥Ù•ˆ°(€€€€€€€€€€€€€€€€€€€€€€¤¹±•¹Ñ °(€€€€€€€€€€€€€€€€€€€‚ÚîÆ­yÒò$BF—FÆR ¢¢%F—FÆR'Ğ¢Ä–çW@¢fÇVS×¶f÷&ÒææÖWĞ¢öä6†ævS×²†R’Óâ6WDf÷&Ò‡²ââæf÷&ÒÂæÖS¢RçF&vWBçfÇVRÒ—Ğ¢Æ6V†öÆFW#×¶—5Æâò%7F'FW""¢$6×–vâF—FÆR'Ğ¢óà¢ÂöÆ&VÃà¢—Ğ¢²†7F—fRÓÓÒ&FW÷6—BÖÖWF†öG2"ÇÀ¢7F—fRÓÓÒ'v—F†G&vÂÖÖWF†öG2"’bb€¢Ãà¢ÆÆ&VÂ6Æ74æÖSÒ&w&–BvÓ"FW‡B×6ÒföçBÖÖVF—VÒ#à¢¶7F—fRÓÓÒ&FW÷6—BÖÖWF†öG2 ¢ò$66÷VçBF—FÆR ¢¢$FW7F–æF–öâÆ&VÂ'Ğ¢Ä–çW@¢fÇVS×¶f÷&ÒæGfW'F—6W'Ğ¢öä6†ævS×²†R’Óà¢6WDf÷&Ò‡²ââæf÷&ÒÂGfW'F—6W#¢RçF&vWBçfÇVRÒ¢Ğ¢óà¢ÂöÆ&VÃà¢¶7F—fRÓÓÒ&FW÷6—BÖÖWF†öG2"ò€¢ÆÆ&VÂ6Æ74æÖSÒ&w&–BvÓ"FW‡B×6ÒföçBÖÖVF—VÒ#à¢66÷VçBçVÖ&W"òvÆÆWBFG&W70¢Ä–çW@¢fÇVS×¶f÷&ÒæÖ÷VçGĞ¢öä6†ævS×²†R’Óà¢6WDf÷&Ò‡²ââæf÷&ÒÂÖ÷VçC¢RçF&vWBçfÇVRÒ¢Ğ¢óà¢ÂöÆ&VÃà¢’¢€¢ÆF—b6Æ74æÖSÒ&w&–BvÓ26Ó¦w&–BÖ6öÇ2Ó"#à¢ÆÆ&VÂ6Æ74æÖSÒ&w&–BvÓ"FW‡B×6ÒföçBÖÖVF—VÒ#à¢Ö–æ–×VÒv—F†G&vÀ¢kºwµçNÂˆ_BˆÛ\ÜÓ˜[YOHšLL›İ[™Y[È›Ü™\ˆ›Ü™\‹\Û]KLŒ™Ë]Ú]HLÈ^\ÛH^\Û]KMÌİ][™K[›Û™H›Øİ\Îœš[™ËLˆ›Øİ\Îœš[™Ë\Û]KLŒ‚ˆ\šXK[X™[H”™\Ü\H‚ˆ‚ˆÜ[Ûˆ˜[YOH˜[[Xİ]š]OÛÜ[Û‚ˆÜ[Ûˆ˜[YOH™\ÜÚ]È‘\ÜÚ]ÏÛÜ[Û‚ˆÜ[Ûˆ˜[YOHÚ]˜]Ø[È•Ú]˜]Ø[ÏÛÜ[Û‚ˆÜ[Ûˆ˜[YOHœ™]Ø\™ÈY™]Ø\™ÏÛÜ[Û‚ˆÜ[Ûˆ˜[YOHœ™Y™\œ˜[È”™Y™\œ˜[ÛÛ[Z\ÜÚ[ÛœÏÛÜ[Û‚ˆÜ[Ûˆ˜[YOHœ[œÈ”[ˆ\˜Ú\Ù\ÏÛÜ[Û‚ˆÜÙ[Xİ‚ˆ[œ]ˆ\OH™]H‚ˆ˜[YO^Ùœ›ÛQ]_BˆÛÚ[™ÙO^Ê]™[
HOˆÂˆÙ]œ›ÛQ]J]™[\™Ù]˜[YJNÂˆÙ]YÙJJNÂˆ_BˆÛ\ÜÓ˜[YOHšLL›İ[™Y[È›Ü™\‹\Û]KLŒ™Ë]Ú]HÚYİË[›Û™H‚ˆ\šXK[X™[H‘œ›ÛH]H‚ˆÏ‚ˆ[œ]ˆ\OH™]H‚ˆ˜[YO^İÑ]_BˆÛÚ[™ÙO^Ê]™[
HOˆÂˆÙ]Ñ]J]™[\™Ù]˜[YJNÂˆÙ]YÙJJNÂˆ_BˆÛ\ÜÓ˜[YOHšLL›İ[™Y[È›Ü™\‹\Û]KLŒ™Ë]Ú]HÚYİË[›Û™H‚ˆ\šXK[X™[H•È]H‚ˆÏ‚ˆÙ]‚ˆĞØ\™XY\‚ˆØ\™ÛÛ[Û\ÜÓ˜[YOHœL‚ˆ]ˆÛ\ÜÓ˜[YOH™›^][\ËXÙ[\ˆ\İYKX™]ÙY[ˆ›Ü™\‹Xˆ›Ü™\‹\Û]KLLMKLÈ^\ÛH^\Û]KMLÛNœMH‚ˆÜ[‚ˆÙš[\™Y›[™İÓØØ[Tİš[™Ê
_H™XÛÜ™ˆí®éÜj×  " ",
                              )}
                          </Badge>
                        ) : active === "ledger" && column === "amount" ? (
                          <span
                            className={`whitespace-nowrap font-semibold tabular-nums ${Number(row.amount ?? 0) < 0 ? "text-rose-600" : "text-emerald-700"}`}
                          >
                            {Number(row.amount ?? 0) < 0 ? "âˆ’" : "+"}PKR{" "}
                            {Math.abs(Number(row.amount ?? 0)).toLocaleString(
                              "en-PK",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              },
                            )}
                          </span>
                        ) : active === "ledger" && column === "reference_id" ? (
                          <span
                            className="font-mono text-xs text-primary"
                            title="Related transaction"
                          >
                            {transactionNoMap[
                              String(row.transaction_id ?? "")
                            ] ??
                              (row.reference_id
                                ? shortId(String(row.reference_id))
                                : "â€”")}
                          </span>
                        ) : active === "ledger" && column === "note" ? (
             ¶»§q«^