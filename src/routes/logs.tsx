import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card, EmptyState, PageHeader, StatusBadge, statusTone } from "@/components/ui-bits";

export const Route = createFileRoute("/logs")({
  head: () => ({ meta: [{ title: "Logy · CMR Central" }] }),
  component: LogsPage,
});

function LogsPage() {
  const { logs } = useStore();
  return (
    <div className="space-y-4">
      <PageHeader title="Automation logy" description={`${logs.length} záznamov`} />
      {logs.length === 0 ? (
        <EmptyState title="Žiadne logy" />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {logs.map((l) => (
              <li
                key={l.id}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-3"
              >
                <StatusBadge tone={statusTone(l.status)}>{l.status}</StatusBadge>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {l.source} · {l.action}
                  </div>
                  <div className="line-clamp-2 text-xs text-muted-foreground">{l.message}</div>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(l.created_at).toLocaleString("sk-SK")}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
