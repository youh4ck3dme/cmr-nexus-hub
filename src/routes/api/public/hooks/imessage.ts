import { createFileRoute } from "@tanstack/react-router";
import { parseMessage } from "@/lib/parsers";
import { imessagePayloadSchema, formatZodIssues } from "@/lib/webhook-schemas";
import { logWebhookError } from "@/lib/webhook-log.server";
import {
  claimWebhookEvent,
  completeWebhookEvent,
  eventIdFromHeaders,
  eventKeyFor,
  releaseWebhookEvent,
} from "@/lib/webhook-idempotency.server";

// POST /api/public/hooks/imessage
// Header: Authorization: Bearer <IMESSAGE_INTAKE_TOKEN>
// Body: { owner_id: string, source?: "imessage"|"sms"|"whatsapp"|"email"|"manual", raw_text: string }
export const Route = createFileRoute("/api/public/hooks/imessage")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.IMESSAGE_INTAKE_TOKEN;
        if (!token) return new Response("Not configured", { status: 503 });

        const auth = request.headers.get("authorization") ?? "";
        const expected = `Bearer ${token}`;
        const a = Buffer.from(auth);
        const b = Buffer.from(expected);
        if (a.length !== b.length) return new Response("Unauthorized", { status: 401 });
        const { timingSafeEqual } = await import("crypto");
        if (!timingSafeEqual(a, b)) return new Response("Unauthorized", { status: 401 });

        let json: unknown;
        const body = await request.text();
        try {
          json = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsedBody = imessagePayloadSchema.safeParse(json);
        if (!parsedBody.success) {
          const msg = formatZodIssues(parsedBody.error);
          await logWebhookError({
            ownerId:
              typeof (json as { owner_id?: unknown })?.owner_id === "string"
                ? (json as { owner_id: string }).owner_id
                : null,
            source: "iMessage",
            action: "intake.message",
            message: `Invalid payload: ${msg}`,
          });
          return new Response(`Invalid payload: ${msg}`, { status: 400 });
        }
        const payload = parsedBody.data;

        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
          return new Response(
            "Not configured: SUPABASE_SERVICE_ROLE_KEY required for webhook inserts",
            { status: 503 },
          );
        }

        const parsed = parseMessage(payload.raw_text);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // --- Idempotency: dedupe retries by event id (or body hash) ---
        const eventKey = eventKeyFor(
          eventIdFromHeaders(request.headers, ["x-imessage-event-id", "x-message-guid"]),
          body,
        );
        const claim = await claimWebhookEvent({
          ownerId: payload.owner_id,
          source: "iMessage",
          eventKey,
        });
        if (claim.kind === "duplicate") {
          return Response.json({ ...claim.response, ok: true, duplicate: true }, { status: 200 });
        }
        const claimId = claim.id;

        const { data, error } = await supabaseAdmin
          .from("message_intakes")
          .insert({
            owner_id: payload.owner_id,
            source: payload.source,
            raw_text: payload.raw_text,
            status: "new",
            ...parsed,
          })
          .select("id")
          .single();
        if (error) {
          await releaseWebhookEvent(claimId);
          await logWebhookError({
            ownerId: payload.owner_id,
            source: "iMessage",
            action: "intake.message",
            message: `Message insert failed: ${error.message}`,
          });
          return new Response(`DB: ${error.message}`, { status: 500 });
        }

        const result = { ok: true, id: data.id, parsed };
        await completeWebhookEvent(claimId, result as unknown as Record<string, unknown>);
        return Response.json(result);
      },
    },
  },
});
