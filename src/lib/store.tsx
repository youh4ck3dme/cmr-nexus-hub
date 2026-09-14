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
import { asDbLead, asDbReport, isUuid, normalizeDate } from "./db-map";

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
  /** True when Supabase hydrate+seed finished without fatal error. */
  dbReady: boolean;
  lastError: string | null;
}

interface StoreApi extends StoreState {
  addLead: (lead: Lead) => Promise<void>;
  addLeads: (leads: Lead[]) => Promise<void>;
  updateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  addReport: (report: LeadReport) => Promise<void>;
  /** Persist report first, then leads (FK-safe). */
  importReport: (report: LeadReport, leads: Lead[]) => Promise<void>;
  reportExists: (report: Pick<LeadReport, "report_number" | "report_date">) => boolean;
  leadExists: (l: { website?: string; email?: string; company_name?: string }) => Lead | null;
  addMessage: (m: MessageIntake) => Promise<void>;
  updateMessage: (id: string, patch: Partial<MessageIntake>) => Promise<void>;
  addLog: (l: AutomationLog) => Promise<void>;
  toggleAutomation: (id: string) => Promise<void>;
  updateFollowUp: (id: string, patch: Partial<FollowUp>) => Promise<void>;
  setTheme: (t: "dark" | "light") => void;
  reload: () => Promise<void>;
  clearError: () => void;
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
  dbReady: false,
  lastError: null,
};

function stripId<T extends { id: string }>(row: T): Omit<T, "id"> {
  const { id: _drop, ...rest } = row;
  void _drop;
  return rest;
}

function formatErr(
  prefix: string,
  error: { message?: string; code?: string; details?: string } | null,
) {
  if (!error) return prefix;
  const bits = [prefix, error.message, error.code, error.details].filter(Boolean);
  return bits.join(" · ");
}

type Loaded = Omit<StoreState, "theme" | "hydrated" | "dbReady" | "lastError">;

async function hydrate(userId: string): Promise<{ data: Loaded; error: string | null }> {
  const q = (t: string) =>
    supabase
      .from(t as never)
      .select("*")
      .eq("owner_id", userId);

  const results = await Promise.all([
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

  const labels = [
    "clients",
    "leads",
    "lead_reports",
    "follow_ups",
    "projects",
    "repos",
    "deployments",
    "wordpress_sites",
    "message_intakes",
    "automations",
    "automation_logs",
    "connectors",
  ];
  const errors = results
    .map((r, i) => (r.error ? formatErr(labels[i], r.error) : null))
    .filter(Boolean);
  if (errors.length) {
    console.error("[store] hydrate errors", errors);
  }

  const [
    clients,
    leads,
    reports,
    followUps,
    projects,
    repos,
    deployments,
    wordpress,
    messages,
    automations,
    logs,
    connectors,
  ] = results;

  return {
    data: {
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
    },
    error: errors.length ? errors.join("; ") : null,
  };
}

type InsertResult = { ok: boolean; error: string | null };

async function insertMany(table: string, rows: Record<string, unknown>[]): Promise<InsertResult> {
  if (rows.length === 0) return { ok: true, error: null };
  const { error } = await supabase.from(table as never).insert(rows as never);
  if (error) {
    console.error(`[store] seed insert ${table}`, error);
    return { ok: false, error: formatErr(table, error) };
  }
  return { ok: true, error: null };
}

async function seedIfEmpty(
  userId: string,
  loaded: Loaded,
): Promise<{ seeded: boolean; error: string | null }> {
  const total =
    loaded.leads.length +
    loaded.projects.length +
    loaded.clients.length +
    loaded.automations.length;
  if (total > 0) return { seeded: false, error: null };

  const withOwner = <T extends object>(row: T) => ({ ...row, owner_id: userId });

  // Order matters for potential FKs; null out non-UUID demo relation ids.
  const jobs: Array<Promise<InsertResult>> = [
    insertMany(
      "clients",
      demoClients.map((c) => withOwner(stripId(c)) as Record<string, unknown>),
    ),
    insertMany(
      "lead_reports",
      demoReports.map((r) => asDbReport(r, userId)),
    ),
    insertMany(
      "leads",
      demoLeads.map((l) => asDbLead({ ...l, source_report_id: undefined }, userId)),
    ),
    insertMany(
      "projects",
      demoProjects.map((p) =>
        withOwner({
          ...stripId(p),
          client_id: null,
          stack: p.stack ?? [],
        }),
      ) as Record<string, unknown>[],
    ),
    insertMany(
      "repos",
      demoRepos.map((r) =>
        withOwner({
          ...stripId(r),
          project_id: null,
        }),
      ) as Record<string, unknown>[],
    ),
    insertMany(
      "deployments",
      demoDeployments.map((d) =>
        withOwner({
          ...stripId(d),
          project_id: null,
        }),
      ) as Record<string, unknown>[],
    ),
    insertMany(
      "wordpress_sites",
      demoWordPress.map((w) => withOwner(stripId(w)) as Record<string, unknown>),
    ),
    insertMany(
      "message_intakes",
      demoMessages.map((m) =>
        withOwner({
          ...stripId(m),
          lead_id: null,
        }),
      ) as Record<string, unknown>[],
    ),
    insertMany(
      "automations",
      demoAutomations.map((a) => withOwner(stripId(a)) as Record<string, unknown>),
    ),
    insertMany(
      "automation_logs",
      demoLogs.map((l) =>
        withOwner({
          ...stripId(l),
          metadata: l.metadata ?? {},
        }),
      ) as Record<string, unknown>[],
    ),
    insertMany(
      "connectors",
      demoConnectors.map((c) =>
        withOwner({
          ...stripId(c),
          required_env: c.required_env ?? [],
        }),
      ) as Record<string, unknown>[],
    ),
  ];

  const results = await Promise.all(jobs);
  const failed = results.filter((r) => !r.ok).map((r) => r.error);
  if (failed.length) {
    return { seeded: true, error: `Seed partial failure: ${failed.join("; ")}` };
  }

  // Optional follow-ups linked to real lead UUIDs (demo lead_ids are not UUIDs).
  const { data: seededLeads } = await supabase
    .from("leads")
    .select("id, company_name, status")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (seededLeads?.length) {
    const today = new Date().toISOString().slice(0, 10);
    const soon = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    const followRows: Record<string, unknown>[] = [];
    const dueish = seededLeads.find((l) => l.status === "follow_up_due") ?? seededLeads[0];
    const keep = seededLeads.find((l) => l.company_name?.includes("Gould")) ?? seededLeads[1];
    if (dueish) {
      followRows.push({
        owner_id: userId,
        lead_id: dueish.id,
        due_date: today,
        status: "pending",
        notes: "Zavolať / poslať draft email.",
      });
    }
    if (keep && keep.id !== dueish?.id) {
      followRows.push({
        owner_id: userId,
        lead_id: keep.id,
        due_date: soon,
        status: "pending",
      });
    }
    if (followRows.length) {
      const fu = await insertMany("follow_ups", followRows);
      if (!fu.ok) {
        return { seeded: true, error: fu.error };
      }
    }
  }

  return { seeded: true, error: null };
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
        let { data: loaded, error: hydrateError } = await hydrate(userId);
        const seed = await seedIfEmpty(userId, loaded);
        if (seed.seeded) {
          const again = await hydrate(userId);
          loaded = again.data;
          hydrateError = again.error ?? seed.error;
        } else if (seed.error) {
          hydrateError = seed.error;
        }

        if (!cancelled) {
          setState((s) => ({
            ...s,
            ...loaded,
            hydrated: true,
            dbReady: !hydrateError && !seed.error,
            lastError: hydrateError ?? seed.error,
          }));
          // Allow retry if seed completely failed (still empty).
          const stillEmpty =
            loaded.leads.length + loaded.projects.length + loaded.clients.length === 0;
          if (stillEmpty && (hydrateError || seed.error)) {
            hydratedFor.current = null;
          }
        }
      } catch (err) {
        console.error("[store] hydrate failed", err);
        if (!cancelled) {
          hydratedFor.current = null;
          setState((s) => ({
            ...s,
            hydrated: true,
            dbReady: false,
            lastError: err instanceof Error ? err.message : String(err),
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, userId]);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, lastError: null }));
  }, []);

  const insertRow = useCallback(
    async (table: string, row: Record<string, unknown>) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from(table as never)
        .insert({ ...row, owner_id: userId } as never);
      if (error) {
        const msg = formatErr(`insert ${table}`, error);
        console.error(`[store] ${msg}`, error);
        setState((s) => ({ ...s, lastError: msg }));
        throw new Error(msg);
      }
    },
    [userId],
  );

  const updateRow = useCallback(
    async (table: string, id: string, patch: Record<string, unknown>) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase
        .from(table as never)
        .update(patch as never)
        .eq("id", id)
        .eq("owner_id", userId);
      if (error) {
        const msg = formatErr(`update ${table}`, error);
        console.error(`[store] ${msg}`, error);
        setState((s) => ({ ...s, lastError: msg }));
        throw new Error(msg);
      }
    },
    [userId],
  );

  const addLead = useCallback(
    async (lead: Lead) => {
      if (!userId) return;
      setState((s) => ({ ...s, leads: [lead, ...s.leads], lastError: null }));
      await insertRow("leads", asDbLead(lead, userId));
    },
    [insertRow, userId],
  );

  const addLeads = useCallback(
    async (leads: Lead[]) => {
      if (!userId || leads.length === 0) return;
      setState((s) => ({ ...s, leads: [...leads, ...s.leads], lastError: null }));
      const rows = leads.map((l) => asDbLead(l, userId));
      const { error } = await supabase.from("leads").insert(rows as never);
      if (error) {
        const msg = formatErr("insert leads", error);
        console.error("[store] addLeads", error);
        setState((s) => ({ ...s, lastError: msg }));
        throw new Error(msg);
      }
    },
    [userId],
  );

  const updateLead = useCallback(
    async (id: string, patch: Partial<Lead>) => {
      setState((s) => ({
        ...s,
        lastError: null,
        leads: s.leads.map((l) =>
          l.id === id ? { ...l, ...patch, updated_at: new Date().toISOString() } : l,
        ),
      }));
      // Never send nested relation blobs unless explicitly patched.
      const dbPatch: Record<string, unknown> = { ...patch };
      if ("source_report_id" in dbPatch && !isUuid(dbPatch.source_report_id)) {
        dbPatch.source_report_id = null;
      }
      delete dbPatch.id;
      await updateRow("leads", id, dbPatch);
    },
    [updateRow],
  );

  const addReport = useCallback(
    async (r: LeadReport) => {
      if (!userId) return;
      setState((s) => ({ ...s, reports: [r, ...s.reports], lastError: null }));
      await insertRow("lead_reports", asDbReport(r, userId));
    },
    [insertRow, userId],
  );

  const importReport = useCallback(
    async (report: LeadReport, leads: Lead[]) => {
      if (!userId) throw new Error("Not authenticated");
      setState((s) => ({
        ...s,
        lastError: null,
        reports: [report, ...s.reports],
        leads: [...leads, ...s.leads],
      }));

      // 1) Report first so FK source_report_id is valid
      const { error: repErr } = await supabase
        .from("lead_reports")
        .insert(asDbReport(report, userId) as never);
      if (repErr) {
        const msg = formatErr("import report", repErr);
        setState((s) => ({ ...s, lastError: msg }));
        throw new Error(msg);
      }

      if (leads.length === 0) return;

      const rows = leads.map((l) => asDbLead({ ...l, source_report_id: report.id }, userId));
      const { error: leadErr } = await supabase.from("leads").insert(rows as never);
      if (leadErr) {
        const msg = formatErr("import leads", leadErr);
        setState((s) => ({ ...s, lastError: msg }));
        throw new Error(msg);
      }
    },
    [userId],
  );

  const reportExists = useCallback<StoreApi["reportExists"]>(
    (r) =>
      state.reports.some((x) => {
        if (r.report_number && x.report_number === r.report_number) return true;
        // Same date alone is not enough if numbers differ; only match date when both lack a number.
        if (!r.report_number && !x.report_number) {
          return normalizeDate(x.report_date) === normalizeDate(r.report_date);
        }
        return false;
      }),
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
    async (m: MessageIntake) => {
      if (!userId) return;
      setState((s) => ({ ...s, messages: [m, ...s.messages], lastError: null }));
      await insertRow("message_intakes", {
        ...stripId(m),
        id: isUuid(m.id) ? m.id : undefined,
        lead_id: isUuid(m.lead_id) ? m.lead_id : null,
      });
    },
    [insertRow, userId],
  );

  const updateMessage = useCallback(
    async (id: string, patch: Partial<MessageIntake>) => {
      setState((s) => ({
        ...s,
        lastError: null,
        messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      }));
      const dbPatch: Record<string, unknown> = { ...patch };
      if ("lead_id" in dbPatch && !isUuid(dbPatch.lead_id)) dbPatch.lead_id = null;
      delete dbPatch.id;
      await updateRow("message_intakes", id, dbPatch);
    },
    [updateRow],
  );

  const addLog = useCallback(
    async (l: AutomationLog) => {
      if (!userId) return;
      setState((s) => ({ ...s, logs: [l, ...s.logs], lastError: null }));
      await insertRow("automation_logs", {
        ...stripId(l),
        id: isUuid(l.id) ? l.id : undefined,
        metadata: l.metadata ?? {},
      });
    },
    [insertRow, userId],
  );

  const toggleAutomation = useCallback(
    async (id: string) => {
      let nextStatus: "enabled" | "disabled" | "mock" = "disabled";
      setState((s) => ({
        ...s,
        lastError: null,
        automations: s.automations.map((a) => {
          if (a.id !== id) return a;
          nextStatus = a.status === "enabled" ? "disabled" : "enabled";
          return { ...a, status: nextStatus };
        }),
      }));
      await updateRow("automations", id, { status: nextStatus });
    },
    [updateRow],
  );

  const updateFollowUp = useCallback(
    async (id: string, patch: Partial<FollowUp>) => {
      setState((s) => ({
        ...s,
        lastError: null,
        followUps: s.followUps.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      }));
      const dbPatch: Record<string, unknown> = { ...patch };
      delete dbPatch.id;
      if ("lead_id" in dbPatch && !isUuid(dbPatch.lead_id)) delete dbPatch.lead_id;
      if (typeof dbPatch.due_date === "string") {
        dbPatch.due_date = normalizeDate(dbPatch.due_date);
      }
      await updateRow("follow_ups", id, dbPatch);
    },
    [updateRow],
  );

  const setTheme = useCallback((theme: "dark" | "light") => {
    setState((s) => ({ ...s, theme }));
  }, []);

  const reload = useCallback(async () => {
    if (!userId) return;
    try {
      const { data: loaded, error } = await hydrate(userId);
      setState((s) => ({
        ...s,
        ...loaded,
        dbReady: !error,
        lastError: error,
      }));
    } catch (err) {
      console.error("[store] reload failed", err);
      setState((s) => ({
        ...s,
        lastError: err instanceof Error ? err.message : String(err),
      }));
    }
  }, [userId]);

  const api = useMemo<StoreApi>(
    () => ({
      ...state,
      addLead,
      addLeads,
      updateLead,
      addReport,
      importReport,
      reportExists,
      leadExists,
      addMessage,
      updateMessage,
      addLog,
      toggleAutomation,
      updateFollowUp,
      setTheme,
      reload,
      clearError,
    }),
    [
      state,
      addLead,
      addLeads,
      updateLead,
      addReport,
      importReport,
      reportExists,
      leadExists,
      addMessage,
      updateMessage,
      addLog,
      toggleAutomation,
      updateFollowUp,
      setTheme,
      reload,
      clearError,
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
