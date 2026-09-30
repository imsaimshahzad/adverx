import { createFileRoute } from "@tanstack/react-router";
import { requireAdApiUser } from "@/lib/ad-api.server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

async function readBody(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export const Route = createFileRoute("/api/ads/$action")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { db } = await requireAdApiUser();
          const body = await readBody(request);

          if (params.action === "start") {
            const adId = String(body.adId ?? "");
            if (!UUID_RE.test(adId)) return jsonError("Invalid ad identifier.");

            const { data, error } = await db.rpc("start_ad_view", {
              p_ad_id: adId,
            });

            if (error) {
              console.error("[AdverX] /api/ads/start failed", error);
              return jsonError(error.message || "Unable to start the ad task.", 400);
            }

            return Response.json({ sessionId: String(data) });
          }

          if (params.action === "loaded") {
            const sessionId = String(body.sessionId ?? "");
            if (!UUID_RE.test(sessionId)) return jsonError("Invalid ad session identifier.");

            const { data, error } = await db.rpc("mark_ad_view_loaded", {
              p_session_id: sessionId,
            });

            if (error) {
              console.error("[AdverX] /api/ads/loaded failed", error);
              return jsonError(error.message || "Unable to record the ad load.", 400);
            }

            return Response.json({ loadedAt: data });
          }

          if (params.action === "claim") {
            const sessionId = String(body.sessionId ?? "");
            const idempotencyKey = String(body.idempotencyKey ?? "");

            if (!UUID_RE.test(sessionId)) return jsonError("Invalid ad session identifier.");
            if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
              return jsonError("Invalid claim request.");
            }

            const { data, error } = await db.rpc("claim_ad_view", {
              p_session_id: sessionId,
              p_idempotency_key: idempotencyKey,
            });

            if (error) {
              console.error("[AdverX] /api/ads/claim failed", error);
              return jsonError(error.message || "Unable to claim the reward.", 400);
            }

            return Response.json({ reward: Number(data ?? 0) });
          }

          if (params.action === "cancel") {
            const sessionId = String(body.sessionId ?? "");
            if (!UUID_RE.test(sessionId)) return jsonError("Invalid ad session identifier.");

            const { data, error } = await db.rpc("cancel_ad_view", {
              p_session_id: sessionId,
            });

            if (error) {
              console.error("[AdverX] /api/ads/cancel failed", error);
              return jsonError(error.message || "Unable to close the ad task.", 400);
            }

            return Response.json({ cancelled: Boolean(data) });
          }

          return jsonError("Unknown ad action.", 404);
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("[AdverX] ad API request failed", error);
          return jsonError("Unable to process the ad request.", 500);
        }
      },
    },
  },
});
