import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Github } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  BtnGhost,
  Card,
  PageHeader,
  StatusBadge,
  statusTone,
} from "@/components/ui-bits";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projekty · CMR Central" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { projects } = useStore();
  return (
    <div className="space-y-4">
      <PageHeader title="Projekty" description={`${projects.length} projektov`} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => (
          <Card key={p.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{p.name}</div>
                <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {p.description}
                </div>
              </div>
              <StatusBadge tone={statusTone(p.status)}>
                {t.projectStatus[p.status]}
              </StatusBadge>
            </div>
            <div className="flex flex-wrap gap-1">
              {p.stack.map((s) => (
                <StatusBadge key={s} tone="muted">{s}</StatusBadge>
              ))}
              <StatusBadge tone={p.priority === "high" ? "error" : p.priority === "medium" ? "warning" : "muted"}>
                {p.priority}
              </StatusBadge>
            </div>
            <div className="mt-auto flex flex-wrap gap-2">
              {p.repo_url && (
                <BtnGhost as="a" href={p.repo_url}>
                  <Github className="h-4 w-4" /> Repo
                </BtnGhost>
              )}
              {p.deployment_url && (
                <BtnGhost as="a" href={p.deployment_url}>
                  <ExternalLink className="h-4 w-4" /> Live
                </BtnGhost>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}