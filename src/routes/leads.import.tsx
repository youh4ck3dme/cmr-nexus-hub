import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, Inbox, FileText } from "lucide-react";
import { useStore } from "@/lib/store";
import { parseLeadReport, type ParsedReportPreview } from "@/lib/parsers";
import {
  BtnGhost,
  BtnPrimary,
  Card,
  PageHeader,
  StatusBadge,
  scoreLabelTone,
} from "@/components/ui-bits";
import type { Lead, LeadReport } from "@/lib/types";
import { newId } from "@/lib/store";

export const Route = createFileRoute("/leads/import")({
  head: () => ({ meta: [{ title: "Import leadov · CMR Central" }] }),
  component: LeadImportPage,
});

const EXAMPLE = `DAILY LEAD REPORT 004
Date: ${new Date().toISOString().slice(0, 10)}

LEAD 1: Example Clinic
Website: exampleclinic.co.uk
Country: UK
Location: London
Size: 50-200
Category: Clinics
Score: 84/100
Score Label: KEEP
Problem: Web nemá online rezervačný systém.
Trigger: Otvorenie novej pobočky.
Revenue: odhad £5k-£10k / mesiac.
Email: info@exampleclinic.co.uk
Decision Makers:
- Jane Doe — Practice Manager — https://linkedin.com/in/example
Sources:
- Companies House 2025
Email Subject: Online booking pre Example Clinic
Email Body: Dobrý deň, videl som...
Follow-up: Krátky check, máte 15 min?
`;

function LeadImportPage() {
  const store = useStore();
  const [raw, setRaw] = useState("");
  const [preview, setPreview] = useState<ParsedReportPreview | null>(null);
  const [imported, setImported] = useState<{ report: string; count: number } | null>(null);
  const [duplicateReport, setDuplicateReport] = useState<string | null>(null);

  function handlePreview() {
    setImported(null);
    setDuplicateReport(null);
    if (!raw.trim()) return;
    const p = parseLeadReport(raw);
    setPreview(p);
  }

  function handleImport() {
    if (!preview) return;
    if (
      store.reportExists({
        report_number: preview.report.report_number,
        report_date: preview.report.report_date,
      })
    ) {
      setDuplicateReport(
        `Report ${preview.report.report_number ?? preview.report.report_date} už bol importovaný.`,
      );
      return;
    }
    const report: LeadReport = {
      ...preview.report,
      id: newId("rep"),
      created_at: new Date().toISOString(),
    };

    const toImport: Lead[] = [];
    const duplicates: Lead[] = [];
    preview.leads.forEach((l) => {
      const existing = store.leadExists({
        website: l.website,
        email: l.email,
        company_name: l.company_name,
      });
      if (existing) {
        duplicates.push({ ...l, warnings: [...l.warnings, "DUPLICATE_OF_" + existing.company_name] });
      } else {
        toImport.push({ ...l, source_report_id: report.id });
      }
    });

    store.addReport(report);
    store.addLeads(toImport);
    store.addLog({
      id: newId("log"),
      source: "Import",
      action: "import.report",
      status: "success",
      message: `Importovaný ${report.title}: ${toImport.length} nových, ${duplicates.length} duplicit.`,
      created_at: new Date().toISOString(),
    });
    setImported({ report: report.title, count: toImport.length });
    setPreview(null);
    setRaw("");
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Import Base44 leadov"
        description="Vlož denný lead report (DAILY LEAD REPORT / NOVÉ LEADY). Nič sa neposiela automaticky."
      />

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Raw report
          </label>
          <BtnGhost onClick={() => setRaw(EXAMPLE)}>Vložiť príklad</BtnGhost>
        </div>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder="Sem prilep celý denný lead report…"
          className="min-h-[220px] w-full resize-y rounded-md border border-border bg-background p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="flex flex-wrap gap-2">
          <BtnPrimary onClick={handlePreview} disabled={!raw.trim()}>
            <Inbox className="h-4 w-4" /> Parsovať preview
          </BtnPrimary>
          <BtnGhost onClick={() => { setRaw(""); setPreview(null); }}>
            Vyčistiť
          </BtnGhost>
        </div>
      </Card>

      {duplicateReport && (
        <Card className="border-warning/40 bg-warning/10 p-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            {duplicateReport}
          </div>
        </Card>
      )}

      {imported && (
        <Card className="border-success/40 bg-success/10 p-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Import hotový: <b>{imported.report}</b> · {imported.count} nových leadov.
          </div>
        </Card>
      )}

      {preview && (
        <div className="space-y-3">
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold">{preview.report.title}</div>
                <div className="text-xs text-muted-foreground">
                  {preview.report.report_number ? `#${preview.report.report_number} · ` : ""}
                  {preview.report.report_date}
                </div>
              </div>
              <div className="flex gap-2">
                <StatusBadge tone="success">{preview.report.keep_count} KEEP</StatusBadge>
                <StatusBadge tone="error">{preview.report.rejected_count} REJECTED</StatusBadge>
                {preview.report.average_keep_score !== undefined && (
                  <StatusBadge tone="info">avg {preview.report.average_keep_score}</StatusBadge>
                )}
              </div>
            </div>
            {preview.warnings.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs">
                {preview.warnings.map((w) => (
                  <li key={w} className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-3 w-3" /> {w}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {preview.leads.map((l) => {
            const dup = store.leadExists({
              website: l.website,
              email: l.email,
              company_name: l.company_name,
            });
            return (
              <Card key={l.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{l.company_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {[l.location, l.country].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <StatusBadge tone={scoreLabelTone(l.score_label)}>
                    {l.score_label} {l.score_total}/{l.score_max}
                  </StatusBadge>
                </div>
                {dup && (
                  <div className="mt-2 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs">
                    <AlertTriangle className="h-3 w-3 text-warning" />
                    Duplicita: už evidujeme <b className="mx-1">{dup.company_name}</b>
                  </div>
                )}
                {l.warnings.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {l.warnings.map((w) => (
                      <StatusBadge key={w} tone="warning">{w}</StatusBadge>
                    ))}
                  </div>
                )}
                {l.drafts.length > 0 && (
                  <div className="mt-3 rounded-md border border-border bg-muted/40 p-2 text-xs">
                    <div className="mb-1 font-medium">Outreach draft ({l.drafts[0].channel})</div>
                    <pre className="whitespace-pre-wrap font-sans text-muted-foreground">
                      {l.drafts[0].body}
                    </pre>
                  </div>
                )}
              </Card>
            );
          })}

          <div className="sticky bottom-20 z-10 flex justify-end gap-2 lg:bottom-4">
            <BtnGhost onClick={() => setPreview(null)}>Zrušiť</BtnGhost>
            <BtnPrimary onClick={handleImport}>
              Potvrdiť import ({preview.leads.length})
            </BtnPrimary>
          </div>
        </div>
      )}
    </div>
  );
}