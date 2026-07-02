import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Mail, Phone, ExternalLink, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import {
  BtnGhost,
  Card,
  EmptyState,
  PageHeader,
  StatusBadge,
  scoreLabelTone,
  statusTone,
} from "@/components/ui-bits";
import type { Lead, LeadStatus, ScoreLabel } from "@/lib/types";

export const Route = createFileRoute("/crm")({
  head: () => ({ meta: [{ title: "CRM · CMR Central" }] }),
  component: CrmPage,
});

const STATUSES: LeadStatus[] = [
  "new", "approved", "rejected", "contacted", "follow_up_due", "replied", "won", "lost",
];
const LABELS: ScoreLabel[] = ["KEEP", "BORDERLINE", "REJECTED"];

function CrmPage() {
  const { leads, updateLead } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [label, setLabel] = useState<ScoreLabel | "all">("all");
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (label !== "all" && l.score_label !== label) return false;
      if (!qq) return true;
      return [l.company_name, l.website, l.email, l.location]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(qq));
    });
  }, [leads, q, status, label]);

  const detail = detailId ? leads.find((l) => l.id === detailId) : null;

  return (
    <div className="space-y-4">
      <PageHeader title="CRM" description={`${leads.length} leadov · ${filtered.length} zobrazených`} />

      <Card className="p-3">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.common.search}
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus | "all")}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">{t.common.all} statusy</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t.leadStatus[s]}</option>
            ))}
          </select>
          <select
            value={label}
            onChange={(e) => setLabel(e.target.value as ScoreLabel | "all")}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">{t.common.all} skóre</option>
            {LABELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState title="Žiadne leady" description="Skús zmeniť filtre alebo importovať report." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((l) => (
            <LeadCard key={l.id} lead={l} onOpen={() => setDetailId(l.id)} />
          ))}
        </div>
      )}

      {detail && (
        <LeadDetailDrawer
          lead={detail}
          onClose={() => setDetailId(null)}
          onStatusChange={(newStatus) => updateLead(detail.id, { status: newStatus })}
        />
      )}
    </div>
  );
}

function LeadCard({ lead, onOpen }: { lead: Lead; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left"
    >
      <Card className="p-4 transition-colors group-hover:border-primary/50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{lead.company_name}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {[lead.location, lead.country].filter(Boolean).join(" · ") || lead.website || "—"}
            </div>
          </div>
          <StatusBadge tone={scoreLabelTone(lead.score_label)}>
            {lead.score_label}
          </StatusBadge>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <StatusBadge tone={statusTone(lead.status)}>{t.leadStatus[lead.status]}</StatusBadge>
          <StatusBadge tone="muted">{lead.score_total}/{lead.score_max}</StatusBadge>
          {lead.warnings.slice(0, 2).map((w) => (
            <StatusBadge key={w} tone="warning">{w}</StatusBadge>
          ))}
        </div>
        {lead.problem_evidence && (
          <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{lead.problem_evidence}</p>
        )}
      </Card>
    </button>
  );
}

function LeadDetailDrawer({
  lead,
  onClose,
  onStatusChange,
}: {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (s: LeadStatus) => void;
}) {
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{lead.company_name}</div>
            <div className="text-xs text-muted-foreground">{lead.website ?? "—"}</div>
          </div>
          <button onClick={onClose} aria-label="Zavrieť" className="grid h-8 w-8 place-items-center rounded-md hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={scoreLabelTone(lead.score_label)}>
              {lead.score_label} {lead.score_total}/{lead.score_max}
            </StatusBadge>
            <StatusBadge tone={statusTone(lead.status)}>{t.leadStatus[lead.status]}</StatusBadge>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <Field label="Krajina" value={lead.country} />
            <Field label="Lokalita" value={lead.location} />
            <Field label="Veľkosť" value={lead.company_size} />
            <Field label="Kategória" value={lead.category} />
            <Field label="Email" value={lead.email} />
            <Field label="Telefón" value={lead.phone} />
          </div>

          {lead.problem_evidence && <Section title="Problem evidence">{lead.problem_evidence}</Section>}
          {lead.trigger_event && <Section title="Trigger event">{lead.trigger_event}</Section>}
          {lead.revenue_impact && <Section title="Revenue impact">{lead.revenue_impact}</Section>}

          {lead.decision_makers.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Decision makers</div>
              <ul className="space-y-1 text-sm">
                {lead.decision_makers.map((d, i) => (
                  <li key={i} className="flex items-center justify-between gap-2">
                    <span className="truncate">{d.name}{d.role ? ` · ${d.role}` : ""}</span>
                    {d.linkedin_url && (
                      <a href={d.linkedin_url} target="_blank" rel="noreferrer" className="text-primary text-xs inline-flex items-center gap-1">
                        LinkedIn <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lead.sources.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Zdroje</div>
              <ul className="space-y-1 text-xs">
                {lead.sources.map((s, i) => (
                  <li key={i} className="text-muted-foreground">
                    • {s.source_text}
                    {s.source_url && (
                      <> — <a href={s.source_url} target="_blank" rel="noreferrer" className="text-primary underline">link</a></>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lead.drafts.length > 0 && (
            <div>
              <div className="mb-1 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Outreach drafty</div>
                <StatusBadge tone="warning">Neposielané automaticky</StatusBadge>
              </div>
              <div className="space-y-2">
                {lead.drafts.map((d) => (
                  <Card key={d.id} className="p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <StatusBadge tone="info">{d.channel}</StatusBadge>
                      {d.subject && <span className="truncate text-xs font-medium">{d.subject}</span>}
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-xs text-muted-foreground">{d.body}</pre>
                    {d.follow_up_message && (
                      <div className="mt-2 text-[11px] text-muted-foreground">
                        Follow-up +{d.follow_up_day ?? 3}d: {d.follow_up_message}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Zmeniť status</div>
            <select
              value={lead.status}
              onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{t.leadStatus[s]}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            {lead.email && (
              <BtnGhost as="a" href={`mailto:${lead.email}`}>
                <Mail className="h-4 w-4" /> Email
              </BtnGhost>
            )}
            {lead.phone && (
              <BtnGhost as="a" href={`tel:${lead.phone}`}>
                <Phone className="h-4 w-4" /> Zavolať
              </BtnGhost>
            )}
            {lead.website && (
              <BtnGhost as="a" href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}>
                <ExternalLink className="h-4 w-4" /> Web
              </BtnGhost>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-sm">{value || "—"}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{title}</div>
      <div className="text-sm">{children}</div>
    </div>
  );
}