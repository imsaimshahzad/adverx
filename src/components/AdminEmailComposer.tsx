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
  {
    name: "Blank",
    subject: "",
    html: "<!doctype html><html><body style='margin:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033'><div style='max-width:640px;margin:0 auto;padding:32px 16px'><div style='background:#fff;border:1px solid #e7ebf2;border-radius:16px;padding:32px'><h2 style='margin:0 0 16px'>Hello!</h2><p style='line-height:1.7;margin:0'>Write your message here.</p></div></div></body></html>"
  },
  {
    name: "Welcome",
    subject: "Welcome to AdverX",
    html: "<!doctype html><html><body style='margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033'><div style='max-width:640px;margin:0 auto;padding:32px 16px'><div style='background:#111827;padding:24px 28px;border-radius:16px 16px 0 0'><div style='font-size:24px;font-weight:800;color:#fff'>AdverX</div><div style='font-size:12px;color:#aab4c5;margin-top:5px'>Simple. Transparent. Rewarding.</div></div><div style='background:#fff;padding:36px 28px;border:1px solid #e7ebf2;border-top:0;border-radius:0 0 16px 16px'><div style='font-size:12px;font-weight:700;letter-spacing:1px;color:#64748b;text-transform:uppercase'>Welcome</div><h1 style='font-size:28px;line-height:1.2;margin:10px 0 16px;color:#111827'>Welcome to AdverX</h1><p style='font-size:15px;line-height:1.75;margin:0 0 20px;color:#475569'>Your account is ready. You can now sign in and explore your AdverX dashboard.</p><a href='https://adverx.online' style='display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:13px 20px;border-radius:9px;font-weight:700;font-size:14px'>Open AdverX</a><p style='font-size:13px;line-height:1.6;color:#94a3b8;margin:28px 0 0'>If you did not create this account, you can safely ignore this email.</p></div><div style='text-align:center;padding:18px;color:#94a3b8;font-size:12px'>© AdverX · support@adverx.online</div></div></body></html>"
  },
  {
    name: "Plan Activated",
    subject: "Your AdverX plan is now active",
    html: "<!doctype html><html><body style='margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033'><div style='max-width:640px;margin:0 auto;padding:32px 16px'><div style='background:#fff;border:1px solid #e7ebf2;border-radius:16px;overflow:hidden'><div style='padding:24px 28px;border-bottom:1px solid #eef2f7'><strong style='font-size:22px;color:#111827'>AdverX</strong><span style='float:right;font-size:12px;color:#64748b;padding-top:5px'>ACCOUNT UPDATE</span></div><div style='padding:36px 28px'><div style='font-size:34px;margin-bottom:12px'>✓</div><h1 style='font-size:26px;margin:0 0 12px;color:#111827'>Plan activated</h1><p style='font-size:15px;line-height:1.75;color:#475569;margin:0 0 22px'>Your AdverX plan has been successfully activated. Your account is now ready for the benefits associated with your selected plan.</p><a href='https://adverx.online' style='display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:9px;font-weight:700'>View dashboard</a></div></div><div style='text-align:center;padding:18px;color:#94a3b8;font-size:12px'>AdverX · support@adverx.online</div></div></body></html>"
  },
  {
    name: "Deposit Approved",
    subject: "Your AdverX deposit has been approved",
    html: "<!doctype html><html><body style='margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033'><div style='max-width:640px;margin:0 auto;padding:32px 16px'><div style='background:#fff;border:1px solid #e7ebf2;border-radius:16px;overflow:hidden'><div style='background:#111827;padding:22px 28px;color:#fff;font-size:22px;font-weight:800'>AdverX</div><div style='padding:34px 28px'><div style='display:inline-block;padding:7px 10px;background:#ecfdf5;color:#047857;border-radius:999px;font-size:12px;font-weight:700'>APPROVED</div><h1 style='font-size:26px;margin:14px 0 12px'>Deposit approved</h1><p style='font-size:15px;line-height:1.75;color:#475569;margin:0 0 22px'>Your deposit has been reviewed and approved. Your account has been updated accordingly.</p><a href='https://adverx.online' style='display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:9px;font-weight:700'>Open dashboard</a></div><div style='padding:18px 28px;background:#f8fafc;color:#64748b;font-size:12px'>This is an automated account notification from AdverX.</div></div></div></body></html>"
  },
  {
    name: "Withdrawal",
    subject: "Update on your AdverX withdrawal",
    html: "<!doctype html><html><body style='margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033'><div style='max-width:640px;margin:0 auto;padding:32px 16px'><div style='background:#fff;border:1px solid #e7ebf2;border-radius:16px;padding:32px 28px'><div style='font-size:12px;font-weight:700;letter-spacing:1px;color:#64748b'>ADVERX ACCOUNT</div><h1 style='font-size:26px;margin:10px 0 14px'>Withdrawal update</h1><p style='font-size:15px;line-height:1.75;color:#475569'>There is an update regarding your withdrawal request. Please sign in to your dashboard to view the latest status and details.</p><a href='https://adverx.online' style='display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:9px;font-weight:700'>Check status</a><p style='font-size:13px;color:#94a3b8;line-height:1.6;margin:26px 0 0'>For your security, AdverX will never ask for your password by email.</p></div><div style='text-align:center;padding:18px;color:#94a3b8;font-size:12px'>AdverX · support@adverx.online</div></div></body></html>"
  },
  {
    name: "Announcement",
    subject: "Important announcement from AdverX",
    html: "<!doctype html><html><body style='margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033'><div style='max-width:640px;margin:0 auto;padding:32px 16px'><div style='background:#111827;padding:28px;color:#fff;border-radius:16px 16px 0 0'><div style='font-size:22px;font-weight:800'>AdverX</div><div style='margin-top:20px;font-size:12px;font-weight:700;letter-spacing:1px;color:#cbd5e1'>IMPORTANT UPDATE</div><h1 style='font-size:28px;line-height:1.25;margin:8px 0 0'>Something worth knowing</h1></div><div style='background:#fff;padding:32px 28px;border:1px solid #e7ebf2;border-top:0;border-radius:0 0 16px 16px'><p style='font-size:15px;line-height:1.8;color:#475569;margin:0 0 22px'>We have an important update to share with you. Replace this paragraph with your announcement details.</p><a href='https://adverx.online' style='display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:9px;font-weight:700'>Learn more</a><p style='font-size:13px;color:#94a3b8;margin:28px 0 0'>Thank you for being part of AdverX.</p></div></div></body></html>"
  },
  {
    name: "Security",
    subject: "Security notice from AdverX",
    html: "<!doctype html><html><body style='margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033'><div style='max-width:640px;margin:0 auto;padding:32px 16px'><div style='background:#fff;border:1px solid #e7ebf2;border-radius:16px;padding:32px 28px'><div style='font-size:12px;font-weight:700;color:#64748b;letter-spacing:1px'>SECURITY NOTICE</div><h1 style='font-size:25px;margin:10px 0 14px'>Your account security matters</h1><p style='font-size:15px;line-height:1.75;color:#475569'>We noticed an account-related event that may require your attention. Sign in directly through the official AdverX website if you need to review your account.</p><a href='https://adverx.online' style='display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:9px;font-weight:700'>Open AdverX</a><p style='font-size:12px;color:#94a3b8;line-height:1.6;margin:24px 0 0'>Never share your password or verification codes with anyone.</p></div></div></body></html>"
  },
  {
    name: "Newsletter",
    subject: "AdverX — Latest updates",
    html: "<!doctype html><html><body style='margin:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033'><div style='max-width:640px;margin:0 auto;padding:32px 16px'><div style='background:#fff;border:1px solid #e7ebf2;border-radius:16px;overflow:hidden'><div style='background:#111827;padding:26px 28px;color:#fff'><div style='font-size:23px;font-weight:800'>AdverX</div><div style='font-size:12px;color:#cbd5e1;margin-top:5px'>Latest updates</div></div><div style='padding:32px 28px'><h1 style='font-size:26px;margin:0 0 14px'>What's new</h1><p style='font-size:15px;line-height:1.75;color:#475569'>Use this clean newsletter layout for product updates, community news, or platform announcements.</p><hr style='border:0;border-top:1px solid #e7ebf2;margin:24px 0'/><h3 style='margin:0 0 8px'>Update title</h3><p style='font-size:14px;line-height:1.7;color:#64748b'>Add your update here. Keep important information concise and easy to scan.</p><a href='https://adverx.online' style='display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 20px;border-radius:9px;font-weight:700;margin-top:8px'>Visit AdverX</a></div><div style='padding:18px 28px;background:#f8fafc;color:#94a3b8;font-size:12px;text-align:center'>AdverX · support@adverx.online</div></div></div></body></html>"
  },
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
