import { createFileRoute } from "@tanstack/react-router";
import { requireAdminUser } from "@/lib/auth.server";

export const Route = createFileRoute("/api/admin-send-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireAdminUser();
          const body = await request.text();
          if (!body || body.length > 350000) {
            return Response.json({ success: false, error: "Invalid email request." }, { status: 400 });
          }
          const endpoint = process.env["SUPABASE_URL"];
          const authorization = request.headers.get("authorization");
          if (!endpoint || !authorization) {
            return Response.json({ success: false, error: "Email service is unavailable." }, { status: 503 });
          }
          const response = await fetch(endpoint.replace(/\/$/, "") + "/functions/v1/admin-send-email", {
            method: "POST",
            headers: { Authorization: authorization, "Content-Type": "application/json", Accept: "application/json" },
            body,
          });
          const responseBody = await response.text();
          return new Response(responseBody || JSON.stringify({ success: false, error: "Email service returned an empty response." }), {
            status: response.status,
            headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
          });
        } catch (error) {
          console.error("[AdverX] admin email proxy failed", error);
          return Response.json({ success: false, error: "Unable to send email." }, { status: 500 });
        }
      },
    },
  },
});
