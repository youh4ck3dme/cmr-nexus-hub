import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  demoAutomations,
  demoClients,
  demoConnectors,
  demoDeployments,
  demoFollowUps,
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
}

const StoreCtx = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState>({
    clients: demoClients,
    leads: demoLeads,
    reports: demoReports,
    followUps: demoFollowUps,
    projects: demoProjects,
    repos: demoRepos,
    deployments: demoDeployments,
    wordpress: demoWordPress,
    messages: demoMessages,
    automations: demoAutomations,
    logs: demoLogs,
    connectors: demoConnectors,
    theme: "dark",
  });

  const addLead = useCallback((lead: Lead) => {
    setState((s) => ({ ...s, leads: [lead, ...s.leads] }));
  }, []);
  const addLeads = useCallback((leads: Lead[]) => {
    setState((s) => ({ ...s, leads: [...leads, ...s.leads] }));
  }, []);
  const updateLead = useCallback((id: string, patch: Partial<Lead>) => {
    setState((s) => ({
      ...s,
      leads: s.leads.map((l) =>
        l.id === id ? { ...l, ...patch, updated_at: new Date().toISOString() } : l,
      ),
    }));
  }, []);
  const addReport = useCallback((r: LeadReport) => {
    setState((s) => ({ ...s, reports: [r, ...s.reports] }));
  }, []);
  const reportExists = useCallback<StoreApi["reportExists"]>(
    (r) => {
      return state.reports.some(
        (x) =>
          (r.report_number && x.report_number === r.report_number) ||
          x.report_date === r.report_date,
      );
    },
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
  const addMessage = useCallback((m: MessageIntake) => {
    setState((s) => ({ ...s, messages: [m, ...s.messages] }));
  }, []);
  const updateMessage = useCallback((id: string, patch: Partial<MessageIntake>) => {
    setState((s) => ({
      ...s,
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  }, []);
  const addLog = useCallback((l: AutomationLog) => {
    setState((s) => ({ ...s, logs: [l, ...s.logs] }));
  }, []);
  const toggleAutomation = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      automations: s.automations.map((a) =>
        a.id === id
          ? {
              ...a,
              status: a.status === "enabled" ? "disabled" : "enabled",
            }
          : a,
      ),
    }));
  }, []);
  const setTheme = useCallback((theme: "dark" | "light") => {
    setState((s) => ({ ...s, theme }));
  }, []);

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
    ],
  );

  return <StoreCtx.Provider value={api}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}