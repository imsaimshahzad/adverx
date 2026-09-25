"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Plus, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { subjectSchema, supportTextSchema, uuidSchema } from "@/lib/input-validation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const db = supabase as any;
const categories = ["Withdrawal Issue", "Task Not Credited", "Account Issue", "Referral Issue", "Other"] as const;
const statuses = ["open", "in_progress", "resolved", "closed"] as const;
const priorities = ["low", "normal", "high", "urgent"] as const;
const priorityLabels: Record<(typeof priorities)[number], string> = { low: "Low", normal: "Medium", high: "High", urgent: "Urgent" };

type Ticket = { id: string; user_id: string; user_name?: string | null; user_public_uid?: string | null; subject: string; description: string | null; message: string | null; category: string; status: string; priority: string; created_at: string; updated_at: string };
type Message = { id: string; ticket_id: string; sender_type: "user" | "admin"; message: string; created_at: string };

function statusClass(status: string) { return status === "open" ? "bg-amber-100 text-amber-800" : status === "resolved" ? "bg-emerald-100 text-emerald-800" : status === "closed" ? "bg-muted text-muted-foreground" : "bg-blue-100 text-blue-800"; }

export function SupportTicketPanel({ admin = false }: { admin?: boolean }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>(categories[0]);
  const [description, setDescription] = useState("");
  const [reply, setReply] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    let query = db.from("support_tickets").select("*").order("updated_at", { ascending: false });
    if (!admin) { const { data: auth } = await db.auth.getUser(); if (!auth.user) return; query = query.eq("user_id", auth.user.id); }
    const { data, error } = await query;
    if (error) {
      console.error("[AdverX] support operation failed", error); toast.error("Unable to complete that support action. Please try again.");
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as Ticket[];
    if (admin && rows.length > 0) {
      const userIds = [...new Set(rows.map((ticket) => ticket.user_id).filter(Boolean))];
      const { data: profiles, error: profileError } = await db
        .from("profiles")
        .select("id, full_name, public_uid")
        .in("id", userIds);

      if (profileError) toast.error(profileError.message);

      const profileMap = new Map(
        (profiles ?? []).map((profile: { id: string; full_name: string | null; public_uid: string | null }) => [
          profile.id,
          profile,
        ]),
      );

      setTickets(rows.map((ticket) => ({
        ...ticket,
        user_name: profileMap.get(ticket.user_id)?.full_name ?? null,
        user_public_uid: profileMap.get(ticket.user_id)?.public_uid ?? null,
      })));
    } else {
      setTickets(rows);
    }
    setLoading(false);
  }, [admin]);

  useEffect(() => { void loadTickets(); }, [loadTickets]);

  async function openTicket(ticket: Ticket) { setSelected(ticket); const { data, error } = await db.from("support_messages").select("*").eq("ticket_id", ticket.id).order("created_at"); if (error) console.error("[AdverX] support operation failed", error); toast.error("Unable to complete that support action. Please try again."); else setMessages(data ?? []); }
  async function createTicket(): Promise<void> { const parsedSubject = subjectSchema.safeParse(subject); const parsedDescription = supportTextSchema.safeParse(description); if (!parsedSubject.success || !parsedDescription.success) { toast.error("Subject must be 3-180 characters and description must be 1-10,000 characters."); return; } const { data: auth } = await db.auth.getUser(); if (!auth.user) return; const { data, error } = await db.from("support_tickets").insert({ user_id: auth.user.id, subject: subject.trim(), category, description: description.trim(), message: description.trim(), status: "open", priority: "normal" }).select().single(); if (error) { console.error("[AdverX] support operation failed", error); toast.error("Unable to complete that support action. Please try again."); return; } await db.from("support_messages").insert({ ticket_id: data.id, sender_type: "user", message: description.trim() }); toast.success("Support ticket created."); setSubject(""); setDescription(""); setCreating(false); await loadTickets(); await openTicket(data); }
  async function sendReply(): Promise<void> { if (!selected || !uuidSchema.safeParse(selected.id).success || !supportTextSchema.safeParse(reply).success) { toast.error("Enter a valid reply."); return; } const { error } = await db.from("support_messages").insert({ ticket_id: selected.id, sender_type: admin ? "admin" : "user", message: reply.trim() }); if (error) { console.error("[AdverX] support operation failed", error); toast.error("Unable to complete that support action. Please try again."); return; } if (!admin) await db.from("support_tickets").update({ updated_at: new Date().toISOString() }).eq("id", selected.id); setReply(""); await openTicket(selected); await loadTickets(); }
  async function updateTicket(field: "status" | "priority", value: string): Promise<void> { if (!selected || !admin) return; const { data, error } = await db.from("support_tickets").update({ [field]: value }).eq("id", selected.id).select().single(); if (error) { console.error("[AdverX] support operation failed", error); toast.error("Unable to complete that support action. Please try again."); return; } setSelected(data); await loadTickets(); }

  const filtered = useMemo(() => tickets.filter((ticket) => (statusFilter === "all" || ticket.status === statusFilter) && (categoryFilter === "all" || ticket.category === categoryFilter) && (priorityFilter === "all" || ticket.priority === priorityFilter)), [tickets, statusFilter, categoryFilter, priorityFilter]);

  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
    <section className="admin-page-shell morphic-expand space-y-4">
      <header><div><p className="admin-accent text-xs font-semibold uppercase tracking-wider">{admin ? "Operations" : "Help center"}</p><h2 className="text-2xl font-semibold tracking-tight">{admin ? "Support Tickets" : "Support"}</h2></div>{!admin && <Button className="admin-button" onClick={() => setCreating(true)}><Plus className="size-4" /> Create Ticket</Button>}</header>
      {admin && <div className="grid gap-2 sm:grid-cols-3"><select className="h-10 rounded-md border bg-background px-3 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{statuses.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="all">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select><select className="h-10 rounded-md border bg-background px-3 text-sm" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}><option value="all">All priorities</option>{priorities.map((p) => <option key={p}>{p}</option>)}</select></div>}
      {creating && <div className="surface grid gap-4 p-5"><h3 className="font-semibold">Create a support ticket</h3><label className="grid gap-2 text-sm"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What do you need help with?" /></label><label className="grid gap-2 text-sm"><Label>Category</Label><select className="h-10 rounded-md border bg-background px-3" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label><label className="grid gap-2 text-sm"><Label>Description</Label><textarea className="min-h-28 rounded-md border bg-background px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} /></label><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button><Button onClick={() => void createTicket()}>Submit ticket</Button></div></div>}
      <div className="surface divide-y divide-border">{loading ? <p className="p-6 text-sm text-muted-foreground">Loading tickets…</p> : filtered.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No support tickets found.</p> : filtered.map((ticket) => <button key={ticket.id} onClick={() => void openTicket(ticket)} className="flex w-full items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-muted/50"><span className="min-w-0"><span className="block truncate font-medium">{ticket.subject}</span><span className="mt-1 block text-xs text-muted-foreground">{ticket.category} · {new Date(ticket.created_at).toLocaleDateString()}</span>{admin ? <span className="mt-1 block truncate text-xs font-medium text-foreground/80">{ticket.user_name || "Unknown user"} · UID: {ticket.user_public_uid || ticket.user_id.slice(0, 8)}</span> : null}</span><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${statusClass(ticket.status)}`}>{ticket.status.replace("_", " ")}</span></button>)}</div>
    </section>
    <section className="surface flex min-h-[28rem] flex-col overflow-hidden">{selected ? <><div className="border-b p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{selected.subject}</h3><p className="mt-1 text-xs text-muted-foreground">{selected.category} · {selected.priority} priority</p>{admin ? <p className="mt-1 text-xs font-medium text-foreground/80">{selected.user_name || "Unknown user"} · UID: {selected.user_public_uid || selected.user_id.slice(0, 8)}</p> : null}</div>{admin && <div className="flex gap-2"><select className="h-9 rounded-md border bg-background px-2 text-xs" value={selected.status} onChange={(e) => void updateTicket("status", e.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select><select className="h-9 rounded-md border bg-background px-2 text-xs" value={selected.priority} onChange={(e) => void updateTicket("priority", e.target.value)}>{priorities.map((p) => <option key={p}>{p}</option>)}</select></div>}</div></div><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.length === 0 ? <p className="text-sm text-muted-foreground">No messages yet.</p> : messages.map((message) => <div key={message.id} className={`max-w-[88%] rounded-xl p-3 text-sm ${message.sender_type === (admin ? "admin" : "user") ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}><div className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase opacity-70">{message.sender_type === "admin" && <ShieldCheck className="size-3" />}{message.sender_type}</div>{message.message}</div>)}</div><div className="flex gap-2 border-t p-3"><textarea className="min-h-10 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm" value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" /><Button size="icon" onClick={() => void sendReply()} aria-label="Send reply"><Send className="size-4" /></Button></div></> : <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground"><MessageCircle className="size-7" /><p className="text-sm">Select a ticket to view the conversation.</p></div>}</section>
  </div>;
}
