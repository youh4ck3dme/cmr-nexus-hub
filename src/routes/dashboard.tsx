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
  Check,
} from "lucide-react";
import { useMemo } from "react";
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

function localToday(): string {
  // Local calendar day (not UTC) so "dnes" matches user timezone.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function datePart(iso: string | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function DashboardPage() {
  const s = useStore();
  const today = localToday();

  const metrics = useMemo(() => {
    const todaysLeads = s.leads.filter((l) => datePart(l.created_at) === today);
    const keepLeads = s.leads.filter((l) => l.score_label === "KEEP");
    const dueFollowUps = s.followUps.filter(
      (f) => f.status === "pending" && datePart(f.due_date) <= today,
    );
    const upcomingFollowUps = s.followUps.filter(
      (f) => f.status === "pending" && datePart(f.due_date) > today,
    );
    const activeProjects = s.projects.filter((p) => p.status === "active");
    const failedDeploys = s.deployments.filter((d) => d.status === "error");
    const wpWarnings = s.wordpress.filter((w) => w.status !== "healthy");
    const missingConnectors = s.connectors.filter((c) => c.status !== "connected");
    const newStatus = s.leads.filter((l) => l.status === "new").length;
    return {
      todaysLeads,
      keepLeads,
      dueFollowUps,
      upcomingFollowUps,
      activeProjects,
      failedDeploys,
      wpWarnings,
      missingConnectors,
      newStatus,
    };
  }, [s.leads, s.followUps, s.projects, s.deployments, s.wordpress, s.connectors, today]);

  const leadById = useMemo(() => {
    const m = new Map(s.leads.map((l) => [l.id, l]));
    return m;
  }, [s.leads]);

  return (
    <div className="space-y-6">
      <RobotParallax />
      <PageHeader
        title="Dashboard"
        description="Prehľad denných leadov, follow-upov, projektov a stavu konektorov."
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

      {!s.hydrated && (
        <Card className="p-3 text-xs text-muted-foreground">Načítavam dáta zo Supabase…</Card>
      )}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Dnešné leady"
          value={metrics.todaysLeads.length}
          hint={`${metrics.keepLeads.length} KEEP · ${metrics.newStatus} new`}
          tone="info"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Follow-ups dnes"
          value={metrics.dueFollowUps.length}
          hint={
            metrics.upcomingFollowUps.length
              ? `+${metrics.upcomingFollowUps.length} nadchádzajúcich`
              : `${s.followUps.filter((f) => f.status === "pending").length} pending celkovo`
          }
          tone={metrics.dueFollowUps.length ? "warning" : "muted"}
          icon={<Bell className="h-4 w-4" />}
        />
        <StatCard
          label="Aktívne projekty"
          value={metrics.activeProjects.length}
          hint={`${s.projects.length} celkovo`}
          tone="success"
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <StatCard
          label="Zlyhané deployments"
          value={metrics.failedDeploys.length}
          tone={metrics.failedDeploys.length ? "error" : "muted"}
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
            {s.leads.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                Žiadne leady.{" "}
                <Link to="/leads/import" className="underline">
                  Importuj report
                </Link>
              </li>
            )}
          </ul>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-4 w-4 text-primary" />
              Follow-ups
            </div>
            <Link to="/crm" className="text-xs text-muted-foreground hover:text-foreground">
              CRM →
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {[...metrics.dueFollowUps, ...metrics.upcomingFollowUps].slice(0, 6).map((f) => {
              const lead = leadById.get(f.lead_id);
              const overdue = f.status === "pending" && datePart(f.due_date) < today;
              const dueToday = f.status === "pending" && datePart(f.due_date) === today;
              return (
                <li key={f.id} className="flex items-start gap-2 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {lead?.company_name ?? "Lead"}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                      <span>{datePart(f.due_date)}</span>
                      {overdue && <StatusBadge tone="error">overdue</StatusBadge>}
                      {dueToday && <StatusBadge tone="warning">dnes</StatusBadge>}
                      {!overdue && !dueToday && <StatusBadge tone="muted">soon</StatusBadge>}
                    </div>
                    {f.notes && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">{f.notes}</div>
                    )}
                  </div>
                  {f.status === "pending" && (
                    <button
                      type="button"
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
                      onClick={() => void s.updateFollowUp(f.id, { status: "done" })}
                      aria-label="Označiť hotové"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
            {s.followUps.filter((f) => f.status === "pending").length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-muted-foreground">
                Žiadne pending follow-upy.
              </li>
            )}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
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
        <Card>
          <div className="border-b border-border px-4 py-3 text-sm font-semibold flex items-center gap-2">
            <Rocket className="h-4 w-4 text-primary" /> Posledné deployments
          </div>
          <ul className="divide-y divide-border">
            {s.deployments.slice(0, 4).map((d) => (
              <li key={d.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm">{d.production_url ?? d.deployment_url}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.branch} · {d.commit_hash ?? "-"}
                  </div>
                </div>
                <StatusBadge tone={statusTone(d.status)}>{d.status}</StatusBadge>
              </li>
            ))}
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
                  <span className="truncate text-sm">
                    {l.source} · {l.action}
                  </span>
                </div>
                <div className="mt-0.5 truncate text-xs text-muted-foreground">{l.message}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
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
            {s.wordpress.length === 0 && (
              <li className="px-4 py-3 text-xs text-muted-foreground">Žiadne WP site.</li>
            )}
          </ul>
        </Card>
        {metrics.missingConnectors.length > 0 && (
          <Card className="border-warning/30 bg-warning/5 p-4">
            <div className="text-sm">
              <span className="font-semibold">Connectors:</span>{" "}
              {metrics.missingConnectors.length} nie je v stave <code>connected</code>. Core CRM
              beží na Supabase; sync konektory potrebujú server ENV.{" "}
              <Link to="/settings" className="underline">
                Nastavenia
              </Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
