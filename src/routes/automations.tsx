import { createFileRoute } from "@tanstack/react-router";
import * as Icons from "lucide-react";
import type { ComponentType } from "react";
import { useStore } from "@/lib/store";
import {
  BtnGhost,
  Card,
  PageHeader,
  StatusBadge,
  statusTone,
} from "@/components/ui-bits";

export const Route = createFileRoute("/automations")({
  head: () => ({ meta: [{ title: "Automatizácie · CMR Central" }] }),
  component: AutomationsPage,
});

function AutomationsPage() {
  const { automations, toggleAutomation } = useStore();
  return (
    <div className="space-y-4">
      <PageHeader
        title="Automatizácie"
        description="Workflow karty. Skutočné dangerous akcie sú vypnuté v mock režime."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {automations.map((a) => {
          const Icon =
            ((Icons as unknown) as Record<string, ComponentType<{ className?: string }>>)[a.icon] ??
            Icons.Zap;
          return (
            <Card key={a.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{a.name}</div>
                    <div className="line-clamp-2 text-xs text-muted-foreground">{a.description}</div>
                  </div>
                </div>
                <StatusBadge tone={statusTone(a.status)}>{a.status}</StatusBadge>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-muted-foreground">
                  {a.last_run ? `Naposledy: ${new Date(a.last_run).toLocaleString("sk-SK")}` : "Nespustené"}
                </div>
                <BtnGhost onClick={() => toggleAutomation(a.id)}>
                  {a.status === "enabled" ? "Vypnúť" : "Zapnúť"}
                </BtnGhost>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}