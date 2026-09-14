import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Globe, Shield, HardDrive, Puzzle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import { syncWordPress } from "@/lib/sync.functions";
import { BtnGhost, Card, PageHeader, StatusBadge } from "@/components/ui-bits";
import { statusTone } from "@/lib/tones";

export const Route = createFileRoute("/wordpress")({
  head: () => ({ meta: [{ title: "WordPress · CMR Central" }] }),
  component: WordPressPage,
});

function WordPressPage() {
  const { wordpress, connectors, reload } = useStore();
  const wp = connectors.find((c) => c.provider === "wordpress");
  const runSync = useServerFn(syncWordPress);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function onSync() {
    setSyncing(true);
    setMsg(null);
    try {
      const res = await runSync();
      await reload();
      setMsg(res.ok ? `Synced ${res.count} site` : (res.reason ?? "Sync failed"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }
  return (
    <div className="space-y-4">
      <PageHeader
        title="WordPress sity"
        description="Plugin-manager štýl. WordPress REST API pripojíš cez Application Password na serveri."
        actions={
          <BtnGhost onClick={onSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sync…" : "Sync now"}
          </BtnGhost>
        }
      />
      {msg && <Card className="p-3 text-xs text-muted-foreground">{msg}</Card>}
      {wp && wp.status !== "connected" && (
        <Card className="border-warning/40 bg-warning/10 p-3 text-sm">
          <b>Mock režim.</b> Nastav <code>WORDPRESS_SITE_URL</code>, <code>WORDPRESS_USERNAME</code>
          , <code>WORDPRESS_APP_PASSWORD</code> pre real WP REST volania.
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {wordpress.map((w) => (
          <Card key={w.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-semibold">{w.name}</span>
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{w.site_url}</div>
              </div>
              <StatusBadge tone={statusTone(w.status)}>{w.status}</StatusBadge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <MetaCell label="WP" value={w.wp_version ?? "—"} />
              <MetaCell label="Plugins" value={String(w.plugins_count ?? "—")} />
              <MetaCell label="Theme" value={w.theme ?? "—"} />
            </div>
            {w.notes && <p className="mt-3 text-xs text-muted-foreground">{w.notes}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <BtnGhost as="a" href={w.admin_url}>
                <ExternalLink className="h-4 w-4" /> Admin
              </BtnGhost>
              <BtnGhost as="a" href={w.site_url}>
                <Globe className="h-4 w-4" /> Site
              </BtnGhost>
              <BtnGhost>
                <Puzzle className="h-4 w-4" /> Plugins
              </BtnGhost>
              <BtnGhost>
                <HardDrive className="h-4 w-4" /> Backups
              </BtnGhost>
              <BtnGhost>
                <Shield className="h-4 w-4" /> Security
              </BtnGhost>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="truncate text-xs font-medium">{value}</div>
    </div>
  );
}
