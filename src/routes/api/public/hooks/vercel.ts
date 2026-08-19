import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Vercel deploy webhook. Configure in Vercel with x-vercel-signature (sha1 hmac).
// Body: { type, payload: { deployment: {...}, project: {...}, ... }, ... }
// We accept and log; DB write requires knowing owner_id → put it in query ?owner_id=...
export const Route = createFileRoute("/api/public/hooks/vercel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.VERCEL_WEBHOOK_SECRET;
        if (!secret) return new Response("Not configured", { status: 503 });

        const signature = request.headers.get("x-vercel-signature") ?? "";
        const body = await request.text();
        const expected = createHmac("sha1", secret).update(body).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const url = new URL(request.url);
        const ownerId = url.searchParams.get("owner_id");
        if (!ownerId) return new Response("Missing owner_id", { status: 400 });

        const event = JSON.parse(body) as {
          type?: string;
          payload?: {
            deployment?: { url?: string; meta?: Record<string, string> };
            project?: { name?: string };
          };
        };

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("automation_logs").insert({
          owner_id: ownerId,
          source: "vercel",
          action: event.type ?? "webhook",
          status: "info",
          message: `Vercel event ${event.type ?? "?"} for ${event.payload?.project?.name ?? "?"}`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          metadata: event as any,
        });

        return Response.json({ ok: true });
      },
    },
  },
});
