import { createFileRoute } from "@tanstack/react-router";
import { Github, ExternalLink, GitPullRequest, CircleDot, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import { syncRepos } from "@/lib/sync.functions";
import { BtnGhost, Card, PageHeader, StatusBadge, statusTone } from "@/components/ui-bits";

export const Route = createFileRoute("/repos")({
  head: () => ({ meta: [{ title: "GitHub · CMR Central" }] }),
  component: ReposPage,
});

function ReposPage() {
  const { repos, connectors, reload } = useStore();
  const gh = connectors.find((c) => c.provider === "github");
  const runSync = useServerFn(syncRepos);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSync() {
    setSyncing(true);
    setMsg(null);
    try {
      const res = await runSync();
      await reload();
      setMsg(res.ok ? `Synced ${res.count} repos` : (res.reason ?? "Sync failed"));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="GitHub repozitáre"
        description="Server-side connector – GITHUB_TOKEN nie je nikdy v prehliadači."
        actions={
          <BtnGhost onClick={onSync} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sync…" : "Sync now"}
          </BtnGhost>
        }
      />
      {msg && <Card className="p-3 text-xs text-muted-foreground">{msg}</Card>}
      {gh && gh.status !== "connected" && (
        <Card className="border-warning/40 bg-warning/10 p-3 text-sm flex items-center justify-between gap-2">
          <div>
            <b>Mock režim.</b> Doplň <code>GITHUB_TOKEN</code> na serverovej strane pre real-time
            dáta.
          </div>
          <StatusBadge tone={statusTone(gh.status)}>{gh.status}</StatusBadge>
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {repos.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-semibold">{r.name}</span>
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {r.default_branch} · {r.last_commit}
                </div>
              </div>
              <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CircleDot className="h-3 w-3" /> {r.open_issues} issues
              </span>
              <span className="inline-flex items-center gap-1">
                <GitPullRequest className="h-3 w-3" /> {r.open_prs} PR
              </span>
            </div>
            <div className="mt-3">
              <BtnGhost as="a" href={r.repo_url}>
                <ExternalLink className="h-4 w-4" /> GitHub
              </BtnGhost>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
