import type { Lead, LeadReport, MessageIntake, ScoreLabel } from "./types";
import { newId } from "./store";

// Base44 daily lead report parser.
// The real reports have a semi-structured shape; we parse defensively so
// unknown formats still yield a preview instead of crashing.

export interface ParsedReportPreview {
  report: Omit<LeadReport, "id" | "created_at">;
  leads: Lead[];
  warnings: string[];
}

const norm = (v: string) => v.trim();

function pickScoreLabel(scoreTotal: number, scoreMax: number): ScoreLabel {
  const pct = scoreMax > 0 ? (scoreTotal / scoreMax) * 100 : 0;
  if (pct >= 75) return "KEEP";
  if (pct >= 50) return "BORDERLINE";
  return "REJECTED";
}

function extractMatch(text: string, regex: RegExp) {
  const m = text.match(regex);
  return m ? norm(m[1]) : undefined;
}

function splitLeadBlocks(raw: string): string[] {
  // Split by "Lead 1:" / "LEAD 2 —" / "###" / horizontal rules / double newline.
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const parts = trimmed
    .split(/\n(?=(?:LEAD\s*\d+|Lead\s*\d+|#{2,3}\s+Lead|-{3,}|={3,}))/g)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) return parts;
  // Fallback: split on blank-line groups larger than 2 lines
  return trimmed
    .split(/\n\s*\n\s*\n/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);
}

function parseLeadBlock(block: string, reportId: string): Lead | null {
  const company =
    extractMatch(block, /(?:Company|Firma|Spolo[čc]nos[ťt])\s*[:\-]\s*(.+)/i) ||
    extractMatch(block, /^(?:LEAD\s*\d+\s*[:\-—]\s*)(.+)$/im);
  if (!company) return null;

  const website = extractMatch(
    block,
    /(?:Website|Web|URL)\s*[:\-]\s*(\S+)/i,
  );
  const email = extractMatch(
    block,
    /(?:Email|E-mail)\s*[:\-]\s*([^\s]+@[^\s]+)/i,
  );
  const phone = extractMatch(block, /(?:Phone|Tel|Telef[oó]n)\s*[:\-]\s*(\+?[\d\s().-]{6,})/i);
  const country = extractMatch(block, /(?:Country|Krajina)\s*[:\-]\s*(.+)/i);
  const location = extractMatch(block, /(?:Location|Lokalita|City|Mesto)\s*[:\-]\s*(.+)/i);
  const size = extractMatch(block, /(?:Size|Company\s*Size|Ve[ľl]kos[ťt])\s*[:\-]\s*(.+)/i);
  const category = extractMatch(block, /(?:Category|Kateg[oó]ria|Segment)\s*[:\-]\s*(.+)/i);
  const problem = extractMatch(block, /(?:Problem|Evidence|Probl[eé]m)\s*[:\-]\s*(.+)/i);
  const trigger = extractMatch(block, /(?:Trigger|Trigger\s*Event|Spú[šs][ťt]a[čc])\s*[:\-]\s*(.+)/i);
  const revenue = extractMatch(block, /(?:Revenue|Revenue\s*Impact|Dopad)\s*[:\-]\s*(.+)/i);
  const contactUrl = extractMatch(block, /(?:Contact\s*URL|Kontakt\s*URL)\s*[:\-]\s*(\S+)/i);

  const scoreMatch = block.match(/(?:Score|Sk[oó]re)\s*[:\-]\s*(\d+)\s*\/\s*(\d+)/i);
  const scoreTotal = scoreMatch ? Number(scoreMatch[1]) : 0;
  const scoreMax = scoreMatch ? Number(scoreMatch[2]) : 100;
  const label =
    (extractMatch(block, /(?:Score\s*Label|Label)\s*[:\-]\s*(KEEP|BORDERLINE|REJECTED)/i) as ScoreLabel | undefined) ??
    pickScoreLabel(scoreTotal, scoreMax);

  const dmMatch = block.match(/(?:Decision\s*Makers?|Rozhodovate[ľl])\s*[:\-]\s*([\s\S]*?)(?:\n\s*\n|$)/i);
  const decision_makers = dmMatch
    ? dmMatch[1]
        .split(/\n|;/)
        .map((s) => s.replace(/^[\s\-*•]+/, "").trim())
        .filter(Boolean)
        .map((line) => {
          const li = line.match(/(https?:\/\/(?:www\.)?linkedin\.com\/\S+)/i);
          const cleaned = line.replace(li?.[0] ?? "", "").trim();
          const [name, role] = cleaned.split(/\s*[—\-–]\s*/);
          return {
            name: name || cleaned,
            role: role || undefined,
            linkedin_url: li?.[0],
          };
        })
    : [];

  const srcMatch = block.match(/(?:Sources?|Zdroje)\s*[:\-]\s*([\s\S]*?)(?:\n\s*\n|$)/i);
  const sources = srcMatch
    ? srcMatch[1]
        .split(/\n|;/)
        .map((s) => s.replace(/^[\s\-*•]+/, "").trim())
        .filter(Boolean)
        .map((line) => {
          const url = line.match(/(https?:\/\/\S+)/)?.[1];
          return { source_text: line.replace(url ?? "", "").trim() || line, source_url: url };
        })
    : [];

  const emailSubject = extractMatch(block, /(?:Email\s*Subject|Predmet)\s*[:\-]\s*(.+)/i);
  const emailBody = extractMatch(block, /(?:Email\s*Body|Telo)\s*[:\-]\s*([\s\S]+?)(?:\n\s*\n|$)/i);
  const liMsg = extractMatch(block, /(?:LinkedIn\s*Message)\s*[:\-]\s*([\s\S]+?)(?:\n\s*\n|$)/i);
  const followUpMsg = extractMatch(block, /(?:Follow[-\s]?up)\s*[:\-]\s*([\s\S]+?)(?:\n\s*\n|$)/i);

  const now = new Date().toISOString();
  const leadId = newId("lead");
  const drafts = [];
  if (emailBody || emailSubject) {
    drafts.push({
      id: newId("d"),
      lead_id: leadId,
      channel: "email" as const,
      subject: emailSubject,
      body: emailBody ?? "",
      follow_up_day: 3,
      follow_up_message: followUpMsg,
      is_sent: false,
      created_at: now,
    });
  }
  if (liMsg) {
    drafts.push({
      id: newId("d"),
      lead_id: leadId,
      channel: "linkedin" as const,
      body: liMsg,
      is_sent: false,
      created_at: now,
    });
  }

  const warnings: string[] = [];
  if (!email && !contactUrl) warnings.push("NO_PUBLIC_EMAIL");
  if (decision_makers.length === 0) warnings.push("UNVERIFIED_DECISION_MAKER");
  if (revenue && /odhad|estimate|~|approx/i.test(revenue)) warnings.push("ESTIMATED_REVENUE_IMPACT");
  if (!email && contactUrl) warnings.push("CONTACT_FORM_ONLY");
  if (sources.length === 0) warnings.push("MISSING_SOURCE");

  return {
    id: leadId,
    company_name: company,
    website,
    country,
    location,
    company_size: size,
    category,
    score_total: scoreTotal,
    score_max: scoreMax,
    score_label: label,
    status: "new",
    problem_evidence: problem,
    trigger_event: trigger,
    revenue_impact: revenue,
    email,
    phone,
    contact_url: contactUrl,
    decision_makers,
    sources,
    drafts,
    source_report_id: reportId,
    warnings,
    created_at: now,
    updated_at: now,
  };
}

export function parseLeadReport(raw: string): ParsedReportPreview {
  const reportId = newId("rep");
  const reportNumber = extractMatch(raw, /(?:DAILY\s+LEAD\s+REPORT|Report)\s*[#]?\s*(\d+)/i);
  const reportDateMatch = raw.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/);
  const reportDate = reportDateMatch?.[0] ?? new Date().toISOString().slice(0, 10);
  const title =
    extractMatch(raw, /^(DAILY\s+LEAD\s+REPORT\s*\d+.*|NOV[ÉE]\s+LEADY.*)$/im) ??
    `Report ${reportDate}`;

  const blocks = splitLeadBlocks(raw);
  const leads = blocks
    .map((b) => parseLeadBlock(b, reportId))
    .filter((l): l is Lead => l !== null);

  const keepCount = leads.filter((l) => l.score_label === "KEEP").length;
  const rejectedCount = leads.filter((l) => l.score_label === "REJECTED").length;
  const avgKeep =
    keepCount > 0
      ? Math.round(
          leads
            .filter((l) => l.score_label === "KEEP")
            .reduce((s, l) => s + (l.score_total / (l.score_max || 100)) * 100, 0) /
            keepCount,
        )
      : undefined;

  const warnings: string[] = [];
  if (leads.length === 0) warnings.push("Nepodarilo sa rozpoznať žiadne leady – skontroluj formát.");
  if (!reportNumber) warnings.push("Chýba číslo reportu.");

  return {
    report: {
      report_number: reportNumber,
      report_date: reportDate,
      title,
      average_keep_score: avgKeep,
      keep_count: keepCount,
      rejected_count: rejectedCount,
      raw_text: raw,
    },
    leads,
    warnings,
  };
}

// Message → lead draft parser
export interface ParsedMessage {
  parsed_company?: string;
  parsed_contact?: string;
  parsed_email?: string;
  parsed_phone?: string;
  parsed_website?: string;
  parsed_budget?: string;
  parsed_service?: string;
  parsed_notes?: string;
}

export function parseMessage(raw: string): ParsedMessage {
  const email = raw.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  const phone = raw.match(/\+?\d[\d\s().-]{6,}\d/)?.[0];
  const website = raw.match(/https?:\/\/[^\s]+|(?:www\.)?[a-z0-9-]+\.(?:com|sk|co\.uk|io|net|org|dev|app)(?:\/\S*)?/i)?.[0];
  const budget = raw.match(/[€$£]\s?\d[\d\s,.]*|(?:\d[\d\s,.]*)\s?(?:€|EUR|GBP|USD)/i)?.[0];
  const service = raw.match(/(?:booking|redesign|web|CRM|dashboard|app|PWA|SEO|automation|integr[aá]cia|integrace|integration)[a-z\s]{0,30}/i)?.[0];
  const contact = raw.match(/(?:from|od|volá|hi,?\s+I['’]?m|som)\s+([A-ZÁ-Ž][\wá-ž]+(?:\s[A-ZÁ-Ž][\wá-ž]+)?)/i)?.[1];
  const companyGuess = raw.match(/(?:for|pre|from|z)\s+([A-ZÁ-Ž][\w&.-]+(?:\s+[A-ZÁ-Ž][\w&.-]+){0,3})/)?.[1];

  return {
    parsed_company: companyGuess,
    parsed_contact: contact,
    parsed_email: email,
    parsed_phone: phone,
    parsed_website: website?.replace(/[.,;)]+$/, ""),
    parsed_budget: budget,
    parsed_service: service,
    parsed_notes: raw.length > 400 ? raw.slice(0, 400) + "…" : undefined,
  };
}

export function messageToDraftLead(msg: MessageIntake): Lead {
  const now = new Date().toISOString();
  return {
    id: newId("lead"),
    company_name: msg.parsed_company ?? "Nepomenovaný lead",
    website: msg.parsed_website,
    email: msg.parsed_email,
    phone: msg.parsed_phone,
    country: undefined,
    location: undefined,
    company_size: undefined,
    category: msg.parsed_service,
    score_total: 0,
    score_max: 100,
    score_label: "BORDERLINE",
    status: "new",
    problem_evidence: msg.parsed_service,
    trigger_event: undefined,
    revenue_impact: msg.parsed_budget,
    notes: msg.parsed_notes ?? msg.raw_text,
    decision_makers: msg.parsed_contact ? [{ name: msg.parsed_contact }] : [],
    sources: [{ source_text: `Message intake (${msg.source})` }],
    drafts: [],
    warnings: ["MISSING_SOURCE"],
    created_at: now,
    updated_at: now,
  };
}