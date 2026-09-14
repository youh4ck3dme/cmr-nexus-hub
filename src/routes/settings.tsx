import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Shield, Key, Database, Globe, Sun, Moon, Loader2, RefreshCw } from "lucide-react";
import { useStore } from "@/lib/store";
import { TRACKED_ENV_KEYS } from "@/lib/env-keys";
import { getEnvStatus, type EnvStatusResult } from "@/lib/settings.functions";
import { BtnGhost, Card, PageHeader, StatusBadge } from "@/components/ui-bits";
import { statusTone } from "@/lib/tones";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Nastavenia · CMR Central" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { connectors, theme, setTheme, hydrated, dbReady, lastError, leads, projects } = useStore();
  const fetchEnv = useServerFn(getEnvStatus);
  const [envStatus, setEnvStatus] = useState<EnvStatusResult | null>(null);
  const [envError, setEnvError] = useState<string | null>(null);
  const [envLoading, setEnvLoading] = useState(true);

  async function loadEnv() {
    setEnvLoading(true);
    setEnvError(null);
    try {
      const res = await fetchEnv();
      setEnvStatus(res);
    } catch (e) {
      setEnvError(e instanceof Error ? e.message : String(e));
      setEnvStatus(null);
    } finally {
      setEnvLoading(false);
    }
  }

  useEffect(() => {
    void loadEnv();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const presentCount = envStatus ? Object.values(envStatus.keys).filter(Boolean).length : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Nastavenia"
        description="Konektory, ENV checklist, téma. Hodnoty ENV sa nikdy nezobrazujú."
        actions={
          <BtnGhost onClick={() => void loadEnv()} disabled={envLoading}>
            <RefreshCw className={`h-4 w-4 ${envLoading ? "animate-spin" : ""}`} />
            Refresh ENV
          </BtnGhost>
        }
      />

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sun className="h-4 w-4 text-primary" /> Téma
        </div>
        <div className="flex gap-2">
          <BtnGhost
            onClick={() => setTheme("dark")}
            className={theme === "dark" ? "border-primary text-primary" : ""}
          >
            <Moon className="h-4 w-4" /> Dark
          </BtnGhost>
          <BtnGhost
            onClick={() => setTheme("light")}
            className={theme === "light" ? "border-primary text-primary" : ""}
          >
            <Sun className="h-4 w-4" /> Light
          </BtnGhost>
        </div>
      </Card>

      <Card className="p-4 flex items-center gap-3 text-sm">
        <Database className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="font-semibold">Databáza</div>
          <div className="text-xs text-muted-foreground">
            {!hydrated
              ? "Načítavam stav Supabase…"
              : dbReady
                ? `Supabase Postgres + Auth + RLS · ${leads.length} leadov · ${projects.length} projektov v session.`
                : lastError
                  ? `Pripojenie zlyhalo: ${lastError}`
                  : "Supabase je nakonfigurované, ale hydrate ešte neprebehol."}
          </div>
          {envStatus && (
            <div className="mt-1 flex flex-wrap gap-1">
              <StatusBadge tone={envStatus.supabase.url ? "success" : "error"}>
                URL {envStatus.supabase.url ? "ok" : "missing"}
              </StatusBadge>
              <StatusBadge tone={envStatus.supabase.publishableKey ? "success" : "error"}>
                publishable {envStatus.supabase.publishableKey ? "ok" : "missing"}
              </StatusBadge>
              <StatusBadge tone={envStatus.supabase.serviceRole ? "success" : "warning"}>
                service_role {envStatus.supabase.serviceRole ? "ok" : "missing"}
              </StatusBadge>
            </div>
          )}
        </div>
        <StatusBadge tone={!hydrated ? "muted" : dbReady ? "success" : "error"}>
          {!hydrated ? "loading" : dbReady ? "live" : "error"}
        </StatusBadge>
      </Card>

      <Card>
        <div className="border-b border-border px-4 py-3 text-sm font-semibold flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" /> Konektory
        </div>
        <ul className="divide-y divide-border">
          {connectors.map((c) => {
            const envOk =
              envStatus &&
              c.required_env.every((k) => envStatus.keys[k] || envStatus.keys[aliasOf(k)]);
            const displayStatus =
              c.status === "connected" ? "connected" : envOk ? "mock" : "missing";
            return (
              <li
                key={c.id}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.config_summary}</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.required_env.map((e) => (
                      <StatusBadge
                        key={e}
                        tone={
                          envStatus
                            ? envStatus.keys[e] || envStatus.keys[aliasOf(e)]
                              ? "success"
                              : "warning"
                            : "muted"
                        }
                      >
                        {e}
                      </StatusBadge>
                    ))}
                  </div>
                </div>
                <StatusBadge tone={statusTone(displayStatus)}>{displayStatus}</StatusBadge>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <div className="border-b border-border px-4 py-3 text-sm font-semibold flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" /> ENV kľúče (len prítomnosť)
          </span>
          {envLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : envStatus ? (
            <span className="text-xs font-normal text-muted-foreground">
              {presentCount}/{TRACKED_ENV_KEYS.length} nastavených
            </span>
          ) : null}
        </div>
        {envError && (
          <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
            ENV check zlyhal: {envError}
          </div>
        )}
        <ul className="grid gap-1 p-3 sm:grid-cols-2">
          {TRACKED_ENV_KEYS.map((k) => {
            const present = envStatus?.keys[k];
            return (
              <li
                key={k}
                className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2"
              >
                <code className="truncate text-xs">{k}</code>
                {envLoading ? (
                  <StatusBadge tone="muted">…</StatusBadge>
                ) : present === undefined ? (
                  <StatusBadge tone="muted">n/a</StatusBadge>
                ) : present ? (
                  <StatusBadge tone="success">ok</StatusBadge>
                ) : (
                  <StatusBadge tone="warning">chýba</StatusBadge>
                )}
              </li>
            );
          })}
        </ul>
        <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
          Hodnoty sa nikdy nezobrazujú v UI. Stav overuje server function <code>getEnvStatus</code>{" "}
          (authenticated).
        </div>
      </Card>

      <Card className="p-4 flex items-start gap-3 text-sm">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div>
          <div className="font-semibold">Bezpečnostné poznámky</div>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground list-disc pl-4">
            <li>Žiadne secrety v localStorage ani v client bundle.</li>
            <li>Konektor API volania idú vždy cez server (nie z prehliadača).</li>
            <li>Outreach je uložený ako draft – nikdy sa neodosiela automaticky.</li>
            <li>iMessage nie je priamo integrovaný – používaj Apple Shortcut webhook.</li>
            <li>
              RLS je zapnuté; každý riadok je scoped na <code>owner_id = auth.uid()</code>.
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

function aliasOf(key: string): string {
  if (key === "GITHUB_TOKEN") return "GITHUB_API_KEY";
  if (key === "GITHUB_API_KEY") return "GITHUB_TOKEN";
  return key;
}
