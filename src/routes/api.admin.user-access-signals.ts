import { createFileRoute } from "@tanstack/react-router";
import { requireAdminUser } from "@/lib/auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/admin/user-access-signals")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminUser();
          const userId = new URL(request.url).searchParams.get("userId")?.trim();
          if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) return Response.json({ ok: false }, { status: 400 });
          const { data, error } = await (supabaseAdmin as any).from("user_access_signals")
            .select("id, ip_address, country, region, city, source, created_at")
            .eq("user_id", userId).order("created_at", { ascending: false }).limit(20);
          if (error) return Response.json({ ok: false }, { status: 500 });
          return Response.json({ ok: true, signals: data ?? [] });
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          const status = message === "Forbidden" ? 403 : message === "Unauthorized" || message === "Two-factor authentication required" ? 401 : 500;
          return Response.json({ ok: false }, { status });
        }
      },
    },
  },
});
