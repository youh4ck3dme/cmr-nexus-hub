import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Rocket, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import { syncDeployments } from "@/lib/sync.functions";
import { BtnGhost, Card, PageHeader, StatusBadge, statusTone } from "@/components/ui-bits";

export const Route = createFileRoute("/deployments")({
  head: () => ({ meta: [{ title: "Vercel · CMR Central" }] }),
  component: DeploymentsPage,
});

function DeploymentsPage() {
  const { deployments, connectors, projects, reload } = useStore();
  const vc = connectors.find((c) => c.provider === "vercel");
  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name ?? "—";
  const runSync = useServerFn(syncDeployments);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  async function onSync() {
    setSyncing(true);
    setMsg(null);
    try {
      const res = await runSync();
      await reload();
      setMsg(res.ok ? `Synced ${res.count} deployments` : (res.reason ?? "Sync failed"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }
  return (
    <div className="space-y-4">
      <PageHeader
        title="Vercel deployments"
        description="Server-side connector – VERCEL_TOKEN nikdy nie v prehliadači."
        actions={
          <BtnGhost onClick={onSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sync…" : "Sync now"}
          </BtnGhost>
        }
      />
      {msg && <Card className="p-3 text-xs text-muted-foreground">{msg}</Card>}
      {vc && vc.status !== "connected" && (
        <Card className="border-warning/40 bg-warning/10 p-3 text-sm">
          <b>Mock režim.</b> Doplň <code>VERCEL_TOKEN</code> pre reálne sťahovanie stavu.
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {deployments.map((d) => (
          <Card key={d.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-semibold">
                    {projectName(d.project_id)}
                  </span>
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {d.branch} · {d.commit_hash ?? "-"}
                </div>
              </div>
              <StatusBadge tone={statusTone(d.status)}>{d.status}</StatusBadge>
            </div>
            <div className="mt-3 space-y-1 text-xs">
              <div className="truncate">
                <span className="text-muted-foreground">Prod:</span>{" "}
                {d.production_url ? (
                  <a
                    href={d.production_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline"
                  >
                    {d.production_url}
                  </a>
                ) : (
                  "—"
                )}
              </div>
              <div className="truncate">
                <span className="text-muted-foreground">Preview:</span>{" "}
                <a
                  href={d.deployment_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  {d.deployment_url}
                </a>
              </div>
            </div>
            <div className="mt-3">
              <BtnGhost as="a" href={d.deployment_url}>
                <ExternalLink className="h-4 w-4" /> Otvoriť
              </BtnGhost>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
