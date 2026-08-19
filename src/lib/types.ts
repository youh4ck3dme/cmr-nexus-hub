export type LeadStatus =
  | "new"
  | "approved"
  | "rejected"
  | "contacted"
  | "follow_up_due"
  | "replied"
  | "won"
  | "lost";

export type ScoreLabel = "KEEP" | "BORDERLINE" | "REJECTED";

export interface DecisionMaker {
  name: string;
  role?: string;
  linkedin_url?: string;
}

export interface LeadSource {
  source_text: string;
  source_url?: string;
}

export interface OutreachDraft {
  id: string;
  lead_id: string;
  channel: "email" | "linkedin" | "sms" | "whatsapp";
  subject?: string;
  body: string;
  follow_up_day?: number;
  follow_up_message?: string;
  is_sent: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  company_name: string;
  website?: string;
  country?: string;
  location?: string;
  company_size?: string;
  category?: string;
  score_total: number;
  score_max: number;
  score_label: ScoreLabel;
  status: LeadStatus;
  problem_evidence?: string;
  trigger_event?: string;
  revenue_impact?: string;
  email?: string;
  phone?: string;
  contact_url?: string;
  notes?: string;
  decision_makers: DecisionMaker[];
  sources: LeadSource[];
  drafts: OutreachDraft[];
  source_report_id?: string;
  warnings: string[];
  created_at: string;
  updated_at: string;
}

export interface LeadReport {
  id: string;
  report_number?: string;
  report_date: string;
  title: string;
  average_keep_score?: number;
  keep_count: number;
  rejected_count: number;
  conclusion?: string;
  raw_text: string;
  created_at: string;
}

export type ProjectStatus =
  | "idea"
  | "planned"
  | "active"
  | "paused"
  | "shipped"
  | "maintenance"
  | "archived";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  stack: string[];
  repo_url?: string;
  deployment_url?: string;
  client_id?: string;
  priority: "low" | "medium" | "high";
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Repository {
  id: string;
  name: string;
  provider: "github" | "gitlab" | "bitbucket";
  repo_url: string;
  default_branch: string;
  last_commit?: string;
  open_issues: number;
  open_prs: number;
  status: "healthy" | "warning" | "error" | "mock";
  project_id?: string;
}

export interface Deployment {
  id: string;
  project_id?: string;
  provider: "vercel" | "netlify" | "cloudflare";
  deployment_url: string;
  production_url?: string;
  status: "ready" | "building" | "error" | "queued" | "mock";
  branch: string;
  commit_hash?: string;
  created_at: string;
}

export interface WordPressSite {
  id: string;
  name: string;
  site_url: string;
  admin_url: string;
  status: "healthy" | "warning" | "error" | "mock";
  wp_version?: string;
  plugins_count?: number;
  theme?: string;
  notes?: string;
}

export interface MessageIntake {
  id: string;
  source: "imessage" | "sms" | "whatsapp" | "email" | "manual";
  raw_text: string;
  parsed_company?: string;
  parsed_contact?: string;
  parsed_email?: string;
  parsed_phone?: string;
  parsed_website?: string;
  parsed_budget?: string;
  parsed_service?: string;
  parsed_notes?: string;
  lead_id?: string;
  status: "new" | "converted" | "ignored";
  created_at: string;
}

export interface AutomationLog {
  id: string;
  source: string;
  action: string;
  status: "success" | "warning" | "error" | "info";
  message: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Automation {
  id: string;
  name: string;
  description: string;
  status: "enabled" | "disabled" | "mock";
  last_run?: string;
  icon: string;
}

export interface Connector {
  id: string;
  name: string;
  provider: string;
  status: "connected" | "mock" | "missing";
  last_sync_at?: string;
  config_summary: string;
  required_env: string[];
}

export interface FollowUp {
  id: string;
  lead_id: string;
  due_date: string;
  status: "pending" | "done" | "skipped";
  notes?: string;
}

export interface Client {
  id: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  website?: string;
  country?: string;
  location?: string;
  notes?: string;
  status: "active" | "inactive" | "prospect";
}
