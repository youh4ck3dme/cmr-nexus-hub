import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageSquare, Wand2, Check, ArrowRightCircle } from "lucide-react";
import { newId, useStore } from "@/lib/store";
import { messageToDraftLead, parseMessage } from "@/lib/parsers";
import {
  BtnGhost,
  BtnPrimary,
  Card,
  EmptyState,
  PageHeader,
  StatusBadge,
} from "@/components/ui-bits";
import { statusTone } from "@/lib/tones";
import type { MessageIntake } from "@/lib/types";

export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Správy · CMR Central" }] }),
  component: MessagesPage,
});

const SOURCES: MessageIntake["source"][] = ["imessage", "sms", "whatsapp", "email", "manual"];

function MessagesPage() {
  const store = useStore();
  const [raw, setRaw] = useState("");
  const [source, setSource] = useState<MessageIntake["source"]>("imessage");

  async function handleAdd() {
    if (!raw.trim()) return;
    const parsed = parseMessage(raw);
    const msg: MessageIntake = {
      id: newId("msg"),
      source,
      raw_text: raw,
      ...parsed,
      status: "new",
      created_at: new Date().toISOString(),
    };
    try {
      await store.addMessage(msg);
      setRaw("");
    } catch {
      // lastError banner in AppShell
    }
  }

  async function handleConvert(m: MessageIntake) {
    const lead = messageToDraftLead(m);
    try {
      // Lead first so message.lead_id FK is valid.
      await store.addLead(lead);
      await store.updateMessage(m.id, { status: "converted", lead_id: lead.id });
      await store.addLog({
        id: newId("log"),
        source: "Message intake",
        action: "convert.to_lead",
        status: "success",
        message: `Správa (${m.source}) skonvertovaná na lead: ${lead.company_name}`,
        created_at: new Date().toISOString(),
      });
    } catch {
      // lastError banner in AppShell
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Správy / SMS / iMessage"
        description="Vlož skopírovanú správu. Nikdy sa nič neposiela automaticky."
      />

      <Card className="p-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)]">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as MessageIntake["source"])}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Sem prilep iMessage / SMS / WhatsApp / email…"
            className="min-h-30 w-full resize-y rounded-md border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-muted-foreground">
            iMessage nemôže byť čítaný priamo z weba. Použi Apple Shortcut webhook alebo manuálny
            paste.
          </div>
          <BtnPrimary onClick={() => void handleAdd()} disabled={!raw.trim()}>
            <Wand2 className="h-4 w-4" /> Parsovať &amp; uložiť
          </BtnPrimary>
        </div>
      </Card>

      {store.messages.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-5 w-5" />}
          title="Žiadne správy"
          description="Vlož prvú správu vyššie."
        />
      ) : (
        <div className="grid gap-3">
          {store.messages.map((m) => (
            <Card key={m.id} className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <StatusBadge tone="info">{m.source}</StatusBadge>
                  <StatusBadge tone={statusTone(m.status)}>{m.status}</StatusBadge>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(m.created_at).toLocaleString("sk-SK")}
                </div>
              </div>
              <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 font-sans text-xs">
                {m.raw_text}
              </pre>
              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <ParsedField label="Firma" value={m.parsed_company} />
                <ParsedField label="Kontakt" value={m.parsed_contact} />
                <ParsedField label="Email" value={m.parsed_email} />
                <ParsedField label="Telefón" value={m.parsed_phone} />
                <ParsedField label="Web" value={m.parsed_website} />
                <ParsedField label="Rozpočet" value={m.parsed_budget} />
                <ParsedField label="Služba" value={m.parsed_service} />
              </div>
              <div className="flex flex-wrap gap-2">
                {m.status === "new" ? (
                  <BtnPrimary onClick={() => void handleConvert(m)}>
                    <ArrowRightCircle className="h-4 w-4" /> Konvertovať na lead
                  </BtnPrimary>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <Check className="h-4 w-4" /> Skonvertované
                  </span>
                )}
                <BtnGhost onClick={() => void store.updateMessage(m.id, { status: "ignored" })}>
                  Ignorovať
                </BtnGhost>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ParsedField({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="truncate text-xs">{value || "—"}</div>
    </div>
  );
}
