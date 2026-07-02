import { createFileRoute } from "@tanstack/react-router";
import { Shield, Key, Database, Globe, Sun, Moon } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  BtnGhost,
  Card,
  PageHeader,
  StatusBadge,
  statusTone,
} from "@/components/ui-bits";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Nastavenia · CMR Central" }] }),
  component: SettingsPage,
});

const ENV_KEYS = [
  "GITHUB_TOKEN",
  "VERCEL_TOKEN",
  "BASE44_WEBHOOK_SECRET",
  "WORDPRESS_SITE_URL",
  "WORDPRESS_USERNAME",
  "WORDPRESS_APP_PASSWORD",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
  "CRM_AUTH_TOKEN",
  "OPENAI_API_KEY",
  "MISTRAL_API_KEY",
];

function SettingsPage() {
  const { connectors, theme, setTheme } = useStore();
  return (
    <div className="space-y-4">
      <PageHeader
        title="Nastavenia"
        description="Konektory, ENV checklist, téma. Hodnoty ENV sa nikdy nezobrazujú."
      />

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sun className="h-4 w-4 text-primary" /> Téma
        </div>
        <div className="flex gap-2">
          <BtnGhost onClick={() => setTheme("dark")} className={theme === "dark" ? "border-primary text-primary" : ""}>
            <Moon className="h-4 w-4" /> Dark
          </BtnGhost>
          <BtnGhost onClick={() => setTheme("light")} className={theme === "light" ? "border-primary text-primary" : ""}>
            <Sun className="h-4 w-4" /> Light
          </BtnGhost>
        </div>
      </Card>

      <Card>
        <div className="border-b border-border px-4 py-3 text-sm font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" /> Konektory
        </div>
        <ul className="divide-y divide-border">
          {connectors.map((c) => (
            <li key={c.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{c.name}</div>
                <div className="truncate text-xs text-muted-foreground">{c.config_summary}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {c.required_env.map((e) => (
                    <StatusBadge key={e} tone="muted">{e}</StatusBadge>
                  ))}
                </div>
              </div>
              <StatusBadge tone={statusTone(c.status)}>{c.status}</StatusBadge>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="border-b border-border px-4 py-3 text-sm font-semibold flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" /> ENV kľúče (len prítomnosť)
        </div>
        <ul className="grid gap-1 p-3 sm:grid-cols-2">
          {ENV_KEYS.map((k) => (
            <li
              key={k}
              className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
            >
              <code className="truncate text-xs">{k}</code>
              <StatusBadge tone="warning">chýba</StatusBadge>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Hodnoty sa nikdy nezobrazujú v UI. Ich stav overuje server-side action.
        </div>
      </Card>

      <Card className="p-4 flex items-start gap-3 text-sm">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <div className="font-semibold">Bezpečnostné poznámky</div>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground list-disc pl-4">
            <li>Žiadne secrety v localStorage.</li>
            <li>Konektor API volania idú vždy cez server (nie z prehliadača).</li>
            <li>Outreach je uložený ako draft – nikdy sa neodosiela automaticky.</li>
            <li>iMessage nie je priamo integrovaný – používaj Apple Shortcut webhook.</li>
            <li>Pri produkčnom nasadení zapni Supabase RLS a auth.</li>
          </ul>
        </div>
      </Card>

      <Card className="p-4 flex items-center gap-3 text-sm">
        <Database className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Databáza</div>
          <div className="text-xs text-muted-foreground">
            Aktuálne: in-memory demo. Pripoj Lovable Cloud pre trvalé úložisko s RLS.
          </div>
        </div>
        <StatusBadge tone="warning">mock</StatusBadge>
      </Card>
    </div>
  );
}