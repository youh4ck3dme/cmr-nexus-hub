import type { Lead, LeadReport } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

/** Normalize to YYYY-MM-DD for Postgres DATE. */
export function normalizeDate(input: string): string {
  const s = (input ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${mm}-${dd}`;
  }
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return new Date(iso).toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/** Keep only columns the DB accepts; drop fake demo FKs / non-UUID ids. */
export function asDbLead(lead: Lead, ownerId: string): Record<string, unknown> {
  const row: Record<string, unknown> = {
    owner_id: ownerId,
    company_name: lead.company_name,
    website: lead.website ?? null,
    country: lead.country ?? null,
    location: lead.location ?? null,
    company_size: lead.company_size ?? null,
    category: lead.category ?? null,
    score_total: lead.score_total ?? 0,
    score_max: lead.score_max ?? 100,
    score_label: lead.score_label,
    status: lead.status,
    problem_evidence: lead.problem_evidence ?? null,
    trigger_event: lead.trigger_event ?? null,
    revenue_impact: lead.revenue_impact ?? null,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
    contact_url: lead.contact_url ?? null,
    notes: lead.notes ?? null,
    decision_makers: lead.decision_makers ?? [],
    sources: lead.sources ?? [],
    drafts: lead.drafts ?? [],
    warnings: lead.warnings ?? [],
    source_report_id: isUuid(lead.source_report_id) ? lead.source_report_id : null,
  };
  if (isUuid(lead.id)) row.id = lead.id;
  if (lead.created_at) row.created_at = lead.created_at;
  if (lead.updated_at) row.updated_at = lead.updated_at;
  return row;
}

export function asDbReport(report: LeadReport, ownerId: string): Record<string, unknown> {
  const row: Record<string, unknown> = {
    owner_id: ownerId,
    report_number: report.report_number ?? null,
    report_date: normalizeDate(report.report_date),
    title: report.title,
    average_keep_score: report.average_keep_score ?? null,
    keep_count: report.keep_count ?? 0,
    rejected_count: report.rejected_count ?? 0,
    conclusion: report.conclusion ?? null,
    raw_text: report.raw_text ?? "",
  };
  if (isUuid(report.id)) row.id = report.id;
  if (report.created_at) row.created_at = report.created_at;
  return row;
}
