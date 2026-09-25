import { useState } from "react";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingButtonContent } from "@/components/LoadingIndicator";
import { supabase } from "@/integrations/supabase/client";

export function AdminEmailComposer() {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!to.trim() || !subject.trim() || !message.trim()) {
      toast.error("Recipient, subject and message are required.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-email", {
        body: {
          to: to.split(/[,\n;]/).map((value) => value.trim()).filter(Boolean),
          subject: subject.trim(),
          message: message.trim(),
        },
      });
      if (error) throw new Error(error.message || "Unable to send email.");
      if (!data?.success) throw new Error(data?.error || "Unable to send email.");
      toast.success("Email sent successfully.");
      setTo("");
      setSubject("");
      setMessage("");
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Unable to send email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-5">
      <Card className="max-w-4xl">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl"><Mail className="size-5" /> Send Email</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">Send a custom email from <strong>AdverX &lt;support@adverx.online&gt;</strong>. Separate multiple recipients with commas.</p>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <form className="grid gap-4" onSubmit={sendEmail}>
            <label className="grid gap-2 text-sm font-medium"><span>Recipient email(s)</span><Input type="text" value={to} onChange={(event) => setTo(event.target.value)} placeholder="user@example.com, another@example.com" autoComplete="off" /></label>
            <label className="grid gap-2 text-sm font-medium"><span>Subject</span><Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="AdverX announcement" /></label>
            <label className="grid gap-2 text-sm font-medium"><span>Message</span><textarea className="min-h-56 w-full resize-y rounded-md border bg-background px-3 py-3 text-sm leading-6" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write your email message..." /></label>
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>Sender: AdverX &lt;support@adverx.online&gt;</span>
              <Button type="submit" disabled={busy} className="w-full sm:w-auto">{busy ? <LoadingButtonContent label="Sending" /> : <><Send className="mr-2 size-4" /> Send Email</>}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
