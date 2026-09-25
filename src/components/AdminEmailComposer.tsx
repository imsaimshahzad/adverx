import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Mail, Send, Eye, Code2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/LoadingIndicator";
import { supabase } from "@/integrations/supabase/client";

type Template = { name: string; subject: string; html: string };

const TEMPLATES: Template[] = [
  { name: "Blank", subject: "", html: "<h2>Hello!</h2><p>Write your message here.</p>" },
  { name: "Welcome", subject: "Welcome to AdverX", html: "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'><h1 style='margin:0 0 12px'>Welcome to AdverX 👋</h1><p>We're glad to have you with us.</p><p>Your AdverX account is ready to use.</p><p>Best regards,<br><strong>AdverX Team</strong></p></div>" },
  { name: "Plan Activated", subject: "Your AdverX plan is activated", html: "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'><h2>Plan Activated ✅</h2><p>Your AdverX plan has been successfully activated.</p><p>You can now access the features and rewards available with your plan.</p><p>— AdverX Team</p></div>" },
  { name: "Deposit Approved", subject: "Your AdverX deposit was approved", html: "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'><h2>Deposit Approved ✅</h2><p>Your deposit has been reviewed and approved.</p><p>Your account balance and plan status have been updated accordingly.</p><p>— AdverX Team</p></div>" },
  { name: "Withdrawal Update", subject: "Update on your AdverX withdrawal", html: "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'><h2>Withdrawal Update</h2><p>There is an update regarding your AdverX withdrawal request.</p><p>Please log in to your account for the latest status.</p><p>— AdverX Team</p></div>" },
  { name: "Announcement", subject: "AdverX Announcement", html: "<div style='font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:32px'><h2>AdverX Announcement 📢</h2><p>We have an important update to share with you.</p><p>Add your announcement details here.</p><p>— AdverX Team</p></div>" },
];

function splitRecipients(value: string) {
  return value.split(/[,;\n]+/).map((v) => v.trim()).filter(Boolean);
}

export function AdminEmailComposer() {
  const [recipients, setRecipients] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState("");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState(TEMPLATES[0].html);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const recipientRef = useRef<HTMLInputElement>(null);

  const addRecipients = (value: string) => {
    const incoming = splitRecipients(value);
    if (!incoming.length) return;
    setRecipients((current) => {
      const seen = new Set(current.map((e) => e.toLowerCase()));
      return [...current, ...incoming.filter((e) => !seen.has(e.toLowerCase()) && (seen.add(e.toLowerCase()), true))];
    });
    setRecipientInput("");
    requestAnimationFrame(() => recipientRef.current?.focus());
  };

  const removeRecipient = (email: string) => setRecipients((current) => current.filter((e) => e !== email));

  const selectTemplate = (template: Template) => {
    setSubject(template.subject);
    setHtml(template.html);
    toast.success(`${template.name} template loaded.`);
  };

  const textFallback = useMemo(() => html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim(), [html]);

  async function sendEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (recipientInput.trim()) addRecipients(recipientInput);
    const finalRecipients = [...recipients, ...splitRecipients(recipientInput)].filter((email, index, arr) => arr.findIndex((e) => e.toLowerCase() === email.toLowerCase()) === index);
    if (!finalRecipients.length || !subject.trim() || !html.trim()) {
      toast.error("Recipient, subject and HTML content are required.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-email", {
        body: { to: finalRecipients, subject: subject.trim(), htmlContent: html.trim(), textContent: textFallback },
      });
      if (error) throw new Error(error.message || "Unable to send email.");
      if (!data?.success) throw new Error(data?.error || "Unable to send email.");
      toast.success(`Email sent to ${finalRecipients.length} recipient${finalRecipients.length === 1 ? "" : "s"}.`);
      setRecipients([]); setRecipientInput(""); setSubject(""); setHtml(TEMPLATES[0].html);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to send email.");
    } finally { setBusy(false); }
  }

  return (
    <div className="grid min-w-0 gap-5">
      <Card className="max-w-5xl">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl"><Mail className="size-5" /> Send Email</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">HTML emails from <strong>AdverX &lt;support@adverx.online&gt;</strong>. Enter adds the recipient; it never sends the email.</p>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <form className="grid gap-4" onSubmit={sendEmail}>
            <div className="grid gap-2 text-sm font-medium">
              <span>Recipients</span>
              <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-2">
                {recipients.map((email) => <span key={email} className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium"><span className="max-w-[240px] truncate">{email}</span><button type="button" onClick={() => removeRecipient(email)} className="rounded-full p-0.5 hover:bg-background" aria-label={`Remove ${email}`}><X className="size-3.5" /></button></span>)}
                <input ref={recipientRef} value={recipientInput} onChange={(e) => { const value=e.target.value; if (/[,;\n]/.test(value)) { addRecipients(value); } else setRecipientInput(value); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === "," || e.key === ";") { e.preventDefault(); addRecipients(recipientInput); } }} className="min-w-[180px] flex-1 bg-transparent py-1 text-sm outline-none" placeholder={recipients.length ? "Add another recipient..." : "user@example.com, another@example.com"} autoComplete="off" />
              </div>
              <p className="text-xs font-normal text-muted-foreground">Use comma, semicolon, or Enter to add recipients. Only the Send Email button sends.</p>
            </div>

            <label className="grid gap-2 text-sm font-medium"><span>Subject</span><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="AdverX announcement" /></label>

            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">Templates</span>
                <div className="flex flex-wrap gap-2">{TEMPLATES.map((t) => <Button key={t.name} type="button" variant="outline" size="sm" onClick={() => selectTemplate(t)}>{t.name}</Button>)}</div>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium">HTML Email</span><Button type="button" variant="outline" size="sm" onClick={() => setPreview((v) => !v)}>{preview ? <><Code2 className="mr-2 size-4" /> HTML</> : <><Eye className="mr-2 size-4" /> Preview</>}</Button></div>
              {preview ? <div className="min-h-72 overflow-auto rounded-md border bg-white p-4" dangerouslySetInnerHTML={{ __html: html }} /> : <textarea className="min-h-72 w-full resize-y rounded-md border bg-background px-3 py-3 font-mono text-xs leading-5" value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<h2>Your email</h2><p>Write HTML here...</p>" spellCheck={false} />}
              <p className="text-xs text-muted-foreground">HTML is sent to Brevo with a plain-text fallback automatically generated from the content.</p>
            </div>

            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Sender: AdverX &lt;support@adverx.online&gt; · {recipients.length} recipient{recipients.length === 1 ? "" : "s"} ready</span>
              <Button type="submit" disabled={busy} className="w-full sm:w-auto">{busy ? <LoadingButtonContent label="Sending" /> : <><Send className="mr-2 size-4" /> Send Email</>}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
