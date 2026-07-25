import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Inbox,
  FolderKanban,
  Github,
  Rocket,
  Globe,
  MessageSquare,
  Zap,
  FileText,
  Settings,
  Menu as MenuIcon,
  X,
  MoreHorizontal,
  Moon,
  Sun,
  Command,
  LogOut,
} from "lucide-react";
import { useState, type ComponentType } from "react";
import { t } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
  { to: "/crm", label: t.nav.crm, icon: Users },
  { to: "/leads/import", label: t.nav.import, icon: Inbox },
  { to: "/projects", label: t.nav.projects, icon: FolderKanban },
  { to: "/repos", label: t.nav.repos, icon: Github },
  { to: "/deployments", label: t.nav.deployments, icon: Rocket },
  { to: "/wordpress", label: t.nav.wordpress, icon: Globe },
  { to: "/messages", label: t.nav.messages, icon: MessageSquare },
  { to: "/automations", label: t.nav.automations, icon: Zap },
  { to: "/logs", label: "Logy", icon: FileText },
  { to: "/settings", label: t.nav.settings, icon: Settings },
];

const MOBILE_PRIMARY: NavItem[] = [
  { to: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
  { to: "/crm", label: t.nav.crm, icon: Users },
  { to: "/leads/import", label: "Import", icon: Inbox },
  { to: "/projects", label: t.nav.projects, icon: FolderKanban },
];

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, setTheme, hydrated, dbReady, lastError, clearError, connectors } = useStore();
  const { user, signOut } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string) =>
    to === "/dashboard" ? pathname === "/dashboard" || pathname === "/" : pathname.startsWith(to);

  const anyConnectorLive = connectors.some((c) => c.status === "connected");
  const dataLabel = !hydrated
    ? "načítavam…"
    : dbReady
      ? "Supabase · live"
      : "Supabase · chyba";
  const modeLabel = anyConnectorLive ? "connectors live" : "connectors mock";

  return (
    <div
      className={cn(
        "min-h-screen w-full text-foreground",
        theme === "dark" ? "dark bg-background" : "bg-background",
      )}
    >
      <div className="flex min-h-screen w-full">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground">
          <div className="flex h-14 items-center gap-2 border-b border-border px-4">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <Command className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{t.app.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">{t.app.tagline}</div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {NAV.map((n) => {
              const Icon = n.icon;
              const active = isActive(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "mb-0.5 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{n.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-3 text-[11px] text-muted-foreground">
            v1.0 · {dataLabel}
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/90 px-3 backdrop-blur lg:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-md border border-border lg:hidden"
              aria-label="Otvoriť menu"
            >
              <MenuIcon className="h-4 w-4" />
            </button>
            <div className="flex min-w-0 items-center gap-2">
              <span className="lg:hidden text-sm font-semibold">{t.app.name}</span>
              <span className="hidden lg:inline text-xs text-muted-foreground">
                Interné · {dataLabel} · {modeLabel}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {user && (
                <span className="hidden sm:inline text-xs text-muted-foreground max-w-[180px] truncate">
                  {user.email}
                </span>
              )}
              <button
                type="button"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
                aria-label="Prepnúť tému"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => void signOut()}
                className="grid h-9 w-9 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
                aria-label="Odhlásiť"
                title="Odhlásiť"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-3 pb-24 pt-4 lg:px-6 lg:pb-8">
            {lastError && (
              <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <span className="min-w-0 break-words">
                  <b>DB / store:</b> {lastError}
                </span>
                <button
                  type="button"
                  onClick={clearError}
                  className="shrink-0 underline"
                >
                  Zavrieť
                </button>
              </div>
            )}
            <Outlet />
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-border bg-background/95 backdrop-blur lg:hidden">
        {MOBILE_PRIMARY.map((n) => {
          const Icon = n.icon;
          const active = isActive(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px]",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{n.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] text-muted-foreground"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span>{t.nav.menu}</span>
        </button>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-border bg-sidebar text-sidebar-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2 min-w-0">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
                  <Command className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{t.app.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {t.app.tagline}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Zavrieť menu"
                className="grid h-8 w-8 place-items-center rounded-md hover:bg-sidebar-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3">
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = isActive(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "mb-0.5 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm",
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/85 hover:bg-sidebar-accent",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{n.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}