import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";
import { parseLeadReport } from "@/lib/parsers";

// POST /api/public/hooks/base44
// Body: { owner_id: string, raw: string }
// Header: x-base44-signature = hex(hmac-sha256(secret, rawBody))
export const Route = createFileRoute("/api/public/hooks/base44")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.BASE44_WEBHOOK_SECRET;
        if (!secret) return new Response("Not configured", { status: 503 });

        const signature = request.headers.get("x-base44-signature") ?? "";
        const body = await request.text();
        const expected = createHmac("sha256", secret).update(body).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: { owner_id?: string; raw?: string };
        try {
          payload = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!payload.owner_id || !payload.raw) {
          return new Response("Missing owner_id or raw", { status: 400 });
        }

        const parsed = parseLeadReport(payload.raw);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: report, error: repErr } = await supabaseAdmin
          .from("lead_reports")
          .insert({ ...parsed.report, owner_id: payload.owner_id })
          .select("id")
          .single();
        if (repErr) return new Response(`DB: ${repErr.message}`, { status: 500 });

        if (parsed.leads.length > 0) {
          const rows = parsed.leads.map(({ id, ...l }) => ({
            ...l,
            source_report_id: report.id,
            owner_id: payload.owner_id!,
          }));
          void id;
          const { error } = await supabaseAdmin.from("leads").insert(rows);
          if (error) return new Response(`DB: ${error.message}`, { status: 500 });
        }

        return Response.json({
          ok: true,
          report_id: report.id,
          leads: parsed.leads.length,
          warnings: parsed.warnings,
        });
      },
    },
  },
});

// eslint suppress: unused destructured id
let id: unknown;
void id;