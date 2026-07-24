import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  demoAutomations,
  demoClients,
  demoConnectors,
  demoDeployments,
  demoLeads,
  demoLogs,
  demoMessages,
  demoProjects,
  demoReports,
  demoRepos,
  demoWordPress,
} from "./demo-data";
import type {
  Automation,
  AutomationLog,
  Client,
  Connector,
  Deployment,
  FollowUp,
  Lead,
  LeadReport,
  MessageIntake,
  Project,
  Repository,
  WordPressSite,
} from "./types";

interface StoreState {
  clients: Client[];
  leads: Lead[];
  reports: LeadReport[];
  followUps: FollowUp[];
  projects: Project[];
  repos: Repository[];
  deployments: Deployment[];
  wordpress: WordPressSite[];
  messages: MessageIntake[];
  automations: Automation[];
  logs: AutomationLog[];
  connectors: Connector[];
  theme: "dark" | "light";
  hydrated: boolean;
}

interface StoreApi extends StoreState {
  addLead: (lead: Lead) => void;
  addLeads: (leads: Lead[]) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  addReport: (report: LeadReport) => void;
  reportExists: (report: Pick<LeadReport, "report_number" | "report_date">) => boolean;
  leadExists: (l: { website?: string; email?: string; company_name?: string }) => Lead | null;
  addMessage: (m: MessageIntake) => void;
  updateMessage: (id: string, patch: Partial<MessageIntake>) => void;
  addLog: (l: AutomationLog) => void;
  toggleAutomation: (id: string) => void;
  setTheme: (t: "dark" | "light") => void;
  reload: () => Promise<void>;
}

const StoreCtx = createContext<StoreApi | null>(null);

const EMPTY_STATE: StoreState = {
  clients: [],
  leads: [],
  reports: [],
  followUps: [],
  projects: [],
  repos: [],
  deployments: [],
  wordpress: [],
  messages: [],
  automations: [],
  logs: [],
  connectors: [],
  theme: "dark",
  hydrated: false,
};

function stripId<T extends { id: string }>(row: T): Omit<T, "id"> {
  const { id: _drop, ...rest } = row;
  void _drop;
  return rest;
}

type Loaded = Omit<StoreState, "theme" | "hydrated">;

async function hydrate(userId: string): Promise<Loaded> {
  const q = (t: string) =>
    supabase.from(t as never).select("*").eq("owner_id", userId);

  const [
    clients, leads, reports, followUps, projects, repos, deployments,
    wordpress, messages, automations, logs, connectors,
  ] = await Promise.all([
    q("clients").order("created_at", { ascending: false }),
    q("leads").order("created_at", { ascending: false }),
    q("lead_reports").order("created_at", { ascending: false }),
    q("follow_ups").order("due_date", { ascending: true }),
    q("projects").order("created_at", { ascending: false }),
    q("repos").order("created_at", { ascending: false }),
    q("deployments").order("created_at", { ascending: false }),
    q("wordpress_sites").order("created_at", { ascending: false }),
    q("message_intakes").order("created_at", { ascending: false }),
    q("automations").order("created_at", { ascending: true }),
    q("automation_logs").order("created_at", { ascending: false }).limit(200),
    q("connectors").order("created_at", { ascending: true }),
  ]);

  return {
    clients: (clients.data ?? []) as unknown as Client[],
    leads: (leads.data ?? []) as unknown as Lead[],
    reports: (reports.data ?? []) as unknown as LeadReport[],
    followUps: (followUps.data ?? []) as unknown as FollowUp[],
    projects: (projects.data ?? []) as unknown as Project[],
    repos: (repos.data ?? []) as unknown as Repository[],
    deployments: (deployments.data ?? []) as unknown as Deployment[],
    wordpress: (wordpress.data ?? []) as unknown as WordPressSite[],
    messages: (messages.data ?? []) as unknown as MessageIntake[],
    automations: (automations.data ?? []) as unknown as Automation[],
    logs: (logs.data ?? []) as unknown as AutomationLog[],
    connectors: (connectors.data ?? []) as unknown as Connector[],
  };
}

async function seedIfEmpty(userId: string, loaded: Loaded): Promise<boolean> {
  const total =
    loaded.leads.length + loaded.projects.length +
    loaded.clients.length + loaded.automations.length;
  if (total > 0) return false;

  const withOwner = <T extends object>(row: T) => ({ ...row, owner_id: userId });
  const from = (t: string) => supabase.from(t as never);

  await Promise.all([
    from("clients").insert(demoClients.map((c) => withOwner(stripId(c))) as never),
    from("leads").insert(demoLeads.map((l) => withOwner(stripId(l))) as never),
    from("lead_reports").insert(demoReports.map((r) => withOwner(stripId(r))) as never),
    from("projects").insert(
      demoProjects.map((p) => withOwner({ ...stripId(p), client_id: null })) as never,
    ),
    from("repos").insert(
      demoRepos.map((r) => withOwner({ ...stripId(r), project_id: null })) as never,
    ),
    from("deployments").insert(
      demoDeployments.map((d) => withOwner({ ...stripId(d), project_id: null })) as never,
    ),
    from("wordpress_sites").insert(demoWordPress.map((w) => withOwner(stripId(w))) as never),
    from("message_intakes").insert(demoMessages.map((m) => withOwner(stripId(m))) as never),
    from("automations").insert(demoAutomations.map((a) => withOwner(stripId(a))) as never),
    from("automation_logs").insert(demoLogs.map((l) => withOwner(stripId(l))) as never),
    from("connectors").insert(demoConnectors.map((c) => withOwner(stripId(c))) as never),
  ]);
  return true;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const [state, setState] = useState<StoreState>(EMPTY_STATE);
  const hydratedFor = useRef<string | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!session || !userId) {
      setState(EMPTY_STATE);
      hydratedFor.current = null;
      return;
    }
    if (hydratedFor.current === userId) return;
    hydratedFor.current = userId;
    let cancelled = false;

    (async () => {
      try {
        let loaded = await hydrate(userId);
        const seeded = await seedIfEmpty(userId, loaded);
        if (seeded) loaded = await hydrate(userId);
        if (!cancelled) setState((s) => ({ ...s, ...loaded, hydrated: true }));
      } catch (err) {
        console.error("[store] hydrate failed", err);
        if (!cancelled) setState((s) => ({ ...s, hydrated: true }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, userId]);

  const insertRow = useCallback(
    (table: string, row: Record<string, unknown>) => {
      if (!userId) return;
      void supabase
        .from(table as never)
        .insert({ ...row, owner_id: userId } as never)
        .then(({ error }) => {
          if (error) console.error(`[store] insert ${table}`, error);
        });
    },
    [userId],
  );

  const updateRow = useCallback(
    (table: string, id: string, patch: Record<string, unknown>) => {
      if (!userId) return;
      void supabase
        .from(table as never)
        .update(patch as never)
        .eq("id", id)
        .eq("owner_id", userId)
        .then(({ error }) => {
          if (error) console.error(`[store] update ${table}`, error);
        });
    },
    [userId],
  );

  const addLead = useCallback(
    (lead: Lead) => {
      setState((s) => ({ ...s, leads: [lead, ...s.leads] }));
      insertRow("leads", { ...stripId(lead), id: lead.id });
    },
    [insertRow],
  );
  const addLeads = useCallback(
    (leads: Lead[]) => {
      setState((s) => ({ ...s, leads: [...leads, ...s.leads] }));
      if (!userId || leads.length === 0) return;
      const rows = leads.map((l) => ({ ...stripId(l), id: l.id, owner_id: userId }));
      void supabase
        .from("leads")
        .insert(rows as never)
        .then(({ error }) => {
          if (error) console.error("[store] addLeads", error);
        });
    },
    [userId],
  );
  const updateLead = useCallback(
    (id: string, patch: Partial<Lead>) => {
      setState((s) => ({
        ...s,
        leads: s.leads.map((l) =>
          l.id === id ? { ...l, ...patch, updated_at: new Date().toISOString() } : l,
        ),
      }));
      updateRow("leads", id, patch as Record<string, unknown>);
    },
    [updateRow],
  );
  const addReport = useCallback(
    (r: LeadReport) => {
      setState((s) => ({ ...s, reports: [r, ...s.reports] }));
      insertRow("lead_reports", { ...stripId(r), id: r.id });
    },
    [insertRow],
  );
  const reportExists = useCallback<StoreApi["reportExists"]>(
    (r) =>
      state.reports.some(
        (x) =>
          (r.report_number && x.report_number === r.report_number) ||
          x.report_date === r.report_date,
      ),
    [state.reports],
  );
  const leadExists = useCallback<StoreApi["leadExists"]>(
    (l) => {
      const norm = (v?: string) =>
        (v ?? "")
          .toLowerCase()
          .replace(/^https?:\/\//, "")
          .replace(/^www\./, "")
          .replace(/\/$/, "")
          .trim();
      const w = norm(l.website);
      const e = norm(l.email);
      const c = norm(l.company_name);
      return (
        state.leads.find(
          (x) =>
            (w && norm(x.website) === w) ||
            (e && norm(x.email) === e) ||
            (c && norm(x.company_name) === c),
        ) ?? null
      );
    },
    [state.leads],
  );
  const addMessage = useCallback(
    (m: MessageIntake) => {
      setState((s) => ({ ...s, messages: [m, ...s.messages] }));
      insertRow("message_intakes", { ...stripId(m), id: m.id });
    },
    [insertRow],
  );
  const updateMessage = useCallback(
    (id: string, patch: Partial<MessageIntake>) => {
      setState((s) => ({
        ...s,
        messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      }));
      updateRow("message_intakes", id, patch as Record<string, unknown>);
    },
    [updateRow],
  );
  const addLog = useCallback(
    (l: AutomationLog) => {
      setState((s) => ({ ...s, logs: [l, ...s.logs] }));
      insertRow("automation_logs", { ...stripId(l), id: l.id });
    },
    [insertRow],
  );
  const toggleAutomation = useCallback(
    (id: string) => {
      let nextStatus: "enabled" | "disabled" | "mock" = "disabled";
      setState((s) => ({
        ...s,
        automations: s.automations.map((a) => {
          if (a.id !== id) return a;
          nextStatus = a.status === "enabled" ? "disabled" : "enabled";
          return { ...a, status: nextStatus };
        }),
      }));
      updateRow("automations", id, { status: nextStatus });
    },
    [updateRow],
  );
  const setTheme = useCallback((theme: "dark" | "light") => {
    setState((s) => ({ ...s, theme }));
  }, []);

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      const loaded = await hydrate(userId);
      setState((s) => ({ ...s, ...loaded }));
    } catch (err) {
      console.error("[store] reload failed", err);
    }
  }, [userId]);

  const api = useMemo<StoreApi>(
    () => ({
      ...state,
      addLead,
      addLeads,
      updateLead,
      addReport,
      reportExists,
      leadExists,
      addMessage,
      updateMessage,
      addLog,
      toggleAutomation,
      setTheme,
      reload,
    }),
    [
      state,
      addLead,
      addLeads,
      updateLead,
      addReport,
      reportExists,
      leadExists,
      addMessage,
      updateMessage,
      addLog,
      toggleAutomation,
      setTheme,
      reload,
    ],
  );

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}

export function newId(_prefix: string) {
  // UUID so client-generated IDs are DB-compatible under RLS.
  void _prefix;
  return crypto.randomUUID();
}