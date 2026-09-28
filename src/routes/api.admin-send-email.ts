import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminUser } from "@/lib/auth.server";

const SUPABASE_FUNCTION_URL =
  "https://iozdfcsounatmcqmgoct.supabase.co/functions/v1/admin-send-email";

export const Route = createFileRoute("/api/admin-send-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.text();
          const parsed = JSON.parse(body) as Record<string, unknown>;

          if (parsed.action === "user_status") {
            const admin = await requireAdminUser();
            const userId = String(parsed.user_id ?? "");
            const status = String(parsed.status ?? "");
            const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

            if (!uuid.test(userId) || !["active", "suspended", "restricted"].includes(status)) {
              return Response.json({ success: false, error: "Invalid user status request." }, { status: 400 });
            }
            if (userId === admin.id) {
              return Response.json({ success: false, error: "Administrators cannot change their own status." }, { status: 400 });
            }

            const { data: target, error: targetError } = await supabaseAdmin
              .from("profiles")
              .select("id, status")
              .eq("id", userId)
              .maybeSingle();

            if (targetError) {
              console.error("[AdVerX] admin status target lookup failed", targetError);
              return Response.json({ success: false, error: "Unable to update user status." }, { status: 500 });
            }
            if (!target) {
              return Response.json({ success: false, error: "User not found." }, { status: 404 });
            }

            const { data, error } = await supabaseAdmin
              .from("profiles")
              .update({ status })
              .eq("id", userId)
              .select("*")
              .single();

            if (error) {
              console.error("[AdVerX] admin status update failed", error);
              return Response.json({ success: false, error: "Unable to update user status." }, { status: 500 });
            }

            const { error: auditError } = await supabaseAdmin
              .from("audit_logs")
              .insert({
                actor_id: admin.id,
                action: "admin_user_status_changed",
                entity_type: "profiles",
                entity_id: userId,
                metadata: { from: target.status, to: status },
              });

            if (auditError) console.error("[AdVerX] admin status audit failed", auditError);

            return Response.json({
              success: true,
              auditLogged: !auditError,
              data,
            });
          }
          if (!body || body.length > 350000) {
            return Response.json(
              { success: false, error: "Invalid email request." },
              { status: 400 },
            );
          }

          const authorization = request.headers.get("authorization");
          if (!authorization?.startsWith("Bearer ")) {
            return Response.json(
              { success: false, error: "Email service is unavailable." },
              { status: 503 },
            );
          }

          const response = await fetch(SUPABASE_FUNCTION_URL, {
            method: "POST",
            headers: {
              Authorization: authorization,
              "Content-Type": "application/json",
              Accept: "application/json",
              Origin: "https://adverx.online",
            },
            body,
          });

          const responseBody = await response.text();

          return new Response(
            responseBody ||
              JSON.stringify({
                success: false,
                error: "Email service returned an empty response.",
              }),
            {
              status: response.status,
              headers: {
                "Content-Type":
                  response.headers.get("content-type") || "application/json",
              },
            },
          );
        } catch (error) {
          console.error("[AdVerX] admin email proxy failed", error);
          return Response.json(
            { success: false, error: "Unable to send email." },
            { status: 500 },
          );
        }
      },
    },
  },
});
