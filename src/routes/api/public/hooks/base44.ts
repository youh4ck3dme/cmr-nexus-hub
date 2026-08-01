import { createFileRoute } from "@tanstack/react-router";
import { asDbLead, asDbReport } from "@/lib/db-map";
import { parseLeadReport } from "@/lib/parsers";
import { verifyHmacSha256Hex } from "@/lib/webhook-crypto";
import { base44PayloadSchema, formatZodIssues } from "@/lib/webhook-schemas";
import { logWebhookError } from "@/lib/webhook-log.server";
import type { Lead, LeadReport } from "@/lib/types";

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
        if (!verifyHmacSha256Hex(secret, body, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let json: unknown;
        try {
          json = JSON.parse(body);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const parsedBody = base44PayloadSchema.safeParse(json);
        if (!parsedBody.success) {
          const msg = formatZodIssues(parsedBody.error);
          await logWebhookError({
            ownerId:
              typeof (json as { owner_id?: unknown })?.owner_id === "string"
                ? ((json as { owner_id: string }).owner_id)
                : null,
            source: "Base44",
            action: "import.report",
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

        const parsed = parseLeadReport(payload.raw);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const reportShell: LeadReport = {
          id: crypto.randomUUID(),
          report_number: parsed.report.report_number,
          report_date: parsed.report.report_date,
          title: parsed.report.title,
          average_keep_score: parsed.report.average_keep_score,
          keep_count: parsed.report.keep_count,
          rejected_count: parsed.report.rejected_count,
          conclusion: parsed.report.conclusion,
          raw_text: parsed.report.raw_text || payload.raw,
          created_at: new Date().toISOString(),
        };

        const { data: report, error: repErr } = await supabaseAdmin
          .from("lead_reports")
          .insert(asDbReport(reportShell, payload.owner_id) as never)
          .select("id")
          .single();
        if (repErr) {
          await logWebhookError({
            ownerId: payload.owner_id,
            source: "Base44",
            action: "import.report",
            message: `Report insert failed: ${repErr.message}`,
          });
          return new Response(`DB: ${repErr.message}`, { status: 500 });
        }

        if (parsed.leads.length > 0) {
          const rows = parsed.leads.map((l: Lead) =>
            asDbLead(
              {
                ...l,
                id: crypto.randomUUID(),
                source_report_id: report.id,
              },
              payload.owner_id,
            ),
          );
          const { error } = await supabaseAdmin.from("leads").insert(rows as never);
          if (error) {
            await logWebhookError({
              ownerId: payload.owner_id,
              source: "Base44",
              action: "import.leads",
              message: `Leads insert failed: ${error.message}`,
              metadata: { report_id: report.id },
            });
            return new Response(`DB: ${error.message}`, { status: 500 });
          }
        }

        await supabaseAdmin.from("automation_logs").insert({
          owner_id: payload.owner_id,
          source: "Base44",
          action: "import.report",
          status: "success",
          message: `Webhook import: ${reportShell.title} · ${parsed.leads.length} leadov`,
          metadata: { report_id: report.id, warnings: parsed.warnings },
        } as never);

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
