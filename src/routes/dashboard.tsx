import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  Inbox,
  Bell,
  FolderKanban,
  Rocket,
  Globe,
  Plug,
  Activity,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { RobotParallax } from "@/components/robot-parallax";
import {
  PageHeader,
  StatCard,
  Card,
  StatusBadge,
  BtnPrimary,
  BtnGhost,
  statusTone,
  scoreLabelTone,
} from "@/components/ui-bits";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard · CMR Central" }],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const s = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const todaysLeads = s.leads.filter((l) => l.created_at.slice(0, 10) === today);
  const keepLeads = s.leads.filter((l) => l.score_label === "KEEP");
  const dueFollowUps = s.followUps.filter(
    (f) => f.status === "pending" && f.due_date.slice(0, 10) <= today,
  );
  const activeProjects = s.projects.filter((p) => p.status === "active");
  const failedDeploys = s.deployments.filter((d) => d.status === "error");
  const wpWarnings = s.wordpress.filter((w) => w.status !== "healthy");
  const missingConnectors = s.connectors.filter((c) => c.status !== "connected");

  return (
    <div className="space-y-6">
      <RobotParallax />
      <PageHeader
        title="Dashboard"
        description="Prehľad denných leadov, projektov a stavu konektorov."
        actions={
          <>
            <Link to="/leads/import">
              <BtnPrimary>
                <Inbox className="h-4 w-4" /> Import
              </BtnPrimary>
            </Link>
            <Link to="/messages" className="hidden sm:inline-flex">
              <BtnGhost>
                <MessageSquare className="h-4 w-4" /> Správa
              </BtnGhost>
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Dnešné leady"
          value={todaysLeads.length}
          hint={`${keepLeads.length} KEEP celkovo`}
          tone="info"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Follow-ups dnes"
          value={dueFollowUps.length}
          tone="warning"
          icon={<Bell className="h-4 w-4" />}
        />
        <StatCard
          label="Aktívne projekty"
          value={activeProjects.length}
          hint={`${s.projects.length} celkovo`}
          tone="success"
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <StatCard
          label="Zlyhané deployments"
          value={failedDeploys.length}
          tone={failedDeploys.length ? "error" : "muted"}
          icon={<Rocket className="h-4 w-4" />}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              Najnovšie leady
            </div>
            <Link to="/crm" className="text-xs text-muted-foreground hover:text-foreground">
              Zobraziť CRM →
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {s.leads.slice(0, 5).map((l) => (
              <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{l.company_name}</span>
                    <StatusBadge tone={scoreLabelTone(l.score_label)}>
                      {l.score_label} {l.score_total}/{l.score_max}
                    </StatusBadge>
                    <StatusBadge tone={statusTone(l.status)}>{l.status}</StatusBadge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {[l.location, l.country, l.category].filter(Boolean).join(" · ") || l.website}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Plug className="h-4 w-4 text-primary" />
              Konektory
            </div>
            <Link to="/settings" className="text-xs text-muted-foreground hover:text-foreground">
              Nastaviť →
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {s.connectors.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="truncate text-sm">{c.name}</span>
                <StatusBadge tone={statusTone(c.status)}>{c.status}</StatusBadge>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="border-b border-border px-4 py-3 text-sm font-semibold flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" /> Posledné deployments
          </div>
          <ul className="divide-y divide-border">
            {s.deployments.slice(0, 4).map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm">{d.production_url ?? d.deployment_url}</div>
                  <div className="text-xs text-muted-foreground">{d.branch} · {d.commit_hash ?? "-"}</div>
                </div>
                <StatusBadge tone={statusTone(d.status)}>{d.status}</StatusBadge>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <div className="border-b border-border px-4 py-3 text-sm font-semibold flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> WordPress stavy
          </div>
          <ul className="divide-y divide-border">
            {s.wordpress.map((w) => (
              <li key={w.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm">{w.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{w.site_url}</div>
                </div>
                <StatusBadge tone={statusTone(w.status)}>{w.status}</StatusBadge>
              </li>
            ))}
            {wpWarnings.length === 0 && (
              <li className="px-4 py-3 text-xs text-muted-foreground">Všetky OK.</li>
            )}
          </ul>
        </Card>
        <Card>
          <div className="border-b border-border px-4 py-3 text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Automation logy
          </div>
          <ul className="divide-y divide-border">
            {s.logs.slice(0, 5).map((l) => (
              <li key={l.id} className="px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={statusTone(l.status)}>{l.status}</StatusBadge>
                  <span className="truncate text-sm">{l.source} · {l.action}</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{l.message}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {missingConnectors.length > 0 && (
        <Card className="border-warning/30 bg-warning/5 p-4">
          <div className="text-sm">
            <span className="font-semibold">Mock mode:</span>{" "}
            {missingConnectors.length} konektorov nie je pripojených. Aplikácia beží
            s demo dátami. Prejdi do{" "}
            <Link to="/settings" className="underline">Nastavenia</Link> pre kontrolu ENV.
          </div>
        </Card>
      )}
    </div>
  );
}