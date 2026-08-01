export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      automation_logs: {
        Row: {
          action: string
          automation_id: string | null
          created_at: string
          id: string
          message: string
          metadata: Json
          owner_id: string
          source: string
          status: Database["public"]["Enums"]["log_status"]
        }
        Insert: {
          action: string
          automation_id?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          owner_id: string
          source: string
          status?: Database["public"]["Enums"]["log_status"]
        }
        Update: {
          action?: string
          automation_id?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json
          owner_id?: string
          source?: string
          status?: Database["public"]["Enums"]["log_status"]
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "automations"
            referencedColumns: ["id"]
          },
        ]
      }
      automations: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          last_run: string | null
          name: string
          owner_id: string
          schedule_cron: string | null
          status: Database["public"]["Enums"]["automation_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          last_run?: string | null
          name: string
          owner_id: string
          schedule_cron?: string | null
          status?: Database["public"]["Enums"]["automation_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          last_run?: string | null
          name?: string
          owner_id?: string
          schedule_cron?: string | null
          status?: Database["public"]["Enums"]["automation_status"]
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          contact_person: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          owner_id: string
          phone: string | null
          status: Database["public"]["Enums"]["client_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          owner_id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          contact_person?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["client_status"]
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      connectors: {
        Row: {
          config_summary: string
          created_at: string
          id: string
          last_sync_at: string | null
          name: string
          owner_id: string
          provider: string
          required_env: Json
          status: Database["public"]["Enums"]["connector_status"]
          updated_at: string
        }
        Insert: {
          config_summary?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name: string
          owner_id: string
          provider: string
          required_env?: Json
          status?: Database["public"]["Enums"]["connector_status"]
          updated_at?: string
        }
        Update: {
          config_summary?: string
          created_at?: string
          id?: string
          last_sync_at?: string | null
          name?: string
          owner_id?: string
          provider?: string
          required_env?: Json
          status?: Database["public"]["Enums"]["connector_status"]
          updated_at?: string
        }
        Relationships: []
      }
      deployments: {
        Row: {
          branch: string
          commit_hash: string | null
          created_at: string
          deployment_url: string
          id: string
          owner_id: string
          production_url: string | null
          project_id: string | null
          provider: Database["public"]["Enums"]["deploy_provider"]
          status: Database["public"]["Enums"]["deploy_status"]
        }
        Insert: {
          branch?: string
          commit_hash?: string | null
          created_at?: string
          deployment_url: string
          id?: string
          owner_id: string
          production_url?: string | null
          project_id?: string | null
          provider?: Database["public"]["Enums"]["deploy_provider"]
          status?: Database["public"]["Enums"]["deploy_status"]
        }
        Update: {
          branch?: string
          commit_hash?: string | null
          created_at?: string
          deployment_url?: string
          id?: string
          owner_id?: string
          production_url?: string | null
          project_id?: string | null
          provider?: Database["public"]["Enums"]["deploy_provider"]
          status?: Database["public"]["Enums"]["deploy_status"]
        }
        Relationships: [
          {
            foreignKeyName: "deployments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          created_at: string
          due_date: string
          id: string
          lead_id: string
          notes: string | null
          owner_id: string
          status: Database["public"]["Enums"]["followup_status"]
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          lead_id: string
          notes?: string | null
          owner_id: string
          status?: Database["public"]["Enums"]["followup_status"]
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          lead_id?: string
          notes?: string | null
          owner_id?: string
          status?: Database["public"]["Enums"]["followup_status"]
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_reports: {
        Row: {
          average_keep_score: number | null
          conclusion: string | null
          created_at: string
          id: string
          keep_count: number
          owner_id: string
          raw_text: string
          rejected_count: number
          report_date: string
          report_number: string | null
          title: string
        }
        Insert: {
          average_keep_score?: number | null
          conclusion?: string | null
          created_at?: string
          id?: string
          keep_count?: number
          owner_id: string
          raw_text?: string
          rejected_count?: number
          report_date: string
          report_number?: string | null
          title: string
        }
        Update: {
          average_keep_score?: number | null
          conclusion?: string | null
          created_at?: string
          id?: string
          keep_count?: number
          owner_id?: string
          raw_text?: string
          rejected_count?: number
          report_date?: string
          report_number?: string | null
          title?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          category: string | null
          company_name: string
          company_size: string | null
          contact_url: string | null
          country: string | null
          created_at: string
          decision_makers: Json
          drafts: Json
          email: string | null
          id: string
          location: string | null
          notes: string | null
          owner_id: string
          phone: string | null
          problem_evidence: string | null
          revenue_impact: string | null
          score_label: Database["public"]["Enums"]["score_label"]
          score_max: number
          score_total: number
          source_report_id: string | null
          sources: Json
          status: Database["public"]["Enums"]["lead_status"]
          trigger_event: string | null
          updated_at: string
          warnings: Json
          website: string | null
        }
        Insert: {
          category?: string | null
          company_name: string
          company_size?: string | null
          contact_url?: string | null
          country?: string | null
          created_at?: string
          decision_makers?: Json
          drafts?: Json
          email?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          owner_id: string
          phone?: string | null
          problem_evidence?: string | null
          revenue_impact?: string | null
          score_label?: Database["public"]["Enums"]["score_label"]
          score_max?: number
          score_total?: number
          source_report_id?: string | null
          sources?: Json
          status?: Database["public"]["Enums"]["lead_status"]
          trigger_event?: string | null
          updated_at?: string
          warnings?: Json
          website?: string | null
        }
        Update: {
          category?: string | null
          company_name?: string
          company_size?: string | null
          contact_url?: string | null
          country?: string | null
          created_at?: string
          decision_makers?: Json
          drafts?: Json
          email?: string | null
          id?: string
          location?: string | null
          notes?: string | null
          owner_id?: string
          phone?: string | null
          problem_evidence?: string | null
          revenue_impact?: string | null
          score_label?: Database["public"]["Enums"]["score_label"]
          score_max?: number
          score_total?: number
          source_report_id?: string | null
          sources?: Json
          status?: Database["public"]["Enums"]["lead_status"]
          trigger_event?: string | null
          updated_at?: string
          warnings?: Json
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_source_report_id_fkey"
            columns: ["source_report_id"]
            isOneToOne: false
            referencedRelation: "lead_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      message_intakes: {
        Row: {
          created_at: string
          id: string
          lead_id: string | null
          owner_id: string
          parsed_budget: string | null
          parsed_company: string | null
          parsed_contact: string | null
          parsed_email: string | null
          parsed_notes: string | null
          parsed_phone: string | null
          parsed_service: string | null
          parsed_website: string | null
          raw_text: string
          source: Database["public"]["Enums"]["message_source"]
          status: Database["public"]["Enums"]["message_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id?: string | null
          owner_id: string
          parsed_budget?: string | null
          parsed_company?: string | null
          parsed_contact?: string | null
          parsed_email?: string | null
          parsed_notes?: string | null
          parsed_phone?: string | null
          parsed_service?: string | null
          parsed_website?: string | null
          raw_text: string
          source?: Database["public"]["Enums"]["message_source"]
          status?: Database["public"]["Enums"]["message_status"]
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string | null
          owner_id?: string
          parsed_budget?: string | null
          parsed_company?: string | null
          parsed_contact?: string | null
          parsed_email?: string | null
          parsed_notes?: string | null
          parsed_phone?: string | null
          parsed_service?: string | null
          parsed_website?: string | null
          raw_text?: string
          source?: Database["public"]["Enums"]["message_source"]
          status?: Database["public"]["Enums"]["message_status"]
        }
        Relationships: [
          {
            foreignKeyName: "message_intakes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          client_id: string | null
          created_at: string
          deployment_url: string | null
          description: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          priority: Database["public"]["Enums"]["priority"]
          repo_url: string | null
          stack: Json
          status: Database["public"]["Enums"]["project_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          deployment_url?: string | null
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          priority?: Database["public"]["Enums"]["priority"]
          repo_url?: string | null
          stack?: Json
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          deployment_url?: string | null
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          priority?: Database["public"]["Enums"]["priority"]
          repo_url?: string | null
          stack?: Json
          status?: Database["public"]["Enums"]["project_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      repos: {
        Row: {
          created_at: string
          default_branch: string
          id: string
          last_commit: string | null
          name: string
          open_issues: number
          open_prs: number
          owner_id: string
          project_id: string | null
          provider: Database["public"]["Enums"]["repo_provider"]
          repo_url: string
          status: Database["public"]["Enums"]["health_status"]
          synced_at: string | null
        }
        Insert: {
          created_at?: string
          default_branch?: string
          id?: string
          last_commit?: string | null
          name: string
          open_issues?: number
          open_prs?: number
          owner_id: string
          project_id?: string | null
          provider?: Database["public"]["Enums"]["repo_provider"]
          repo_url: string
          status?: Database["public"]["Enums"]["health_status"]
          synced_at?: string | null
        }
        Update: {
          created_at?: string
          default_branch?: string
          id?: string
          last_commit?: string | null
          name?: string
          open_issues?: number
          open_prs?: number
          owner_id?: string
          project_id?: string | null
          provider?: Database["public"]["Enums"]["repo_provider"]
          repo_url?: string
          status?: Database["public"]["Enums"]["health_status"]
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string
          event_key: string
          id: string
          owner_id: string | null
          response: Json
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_key: string
          id?: string
          owner_id?: string | null
          response?: Json
          source: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_key?: string
          id?: string
          owner_id?: string | null
          response?: Json
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      wordpress_sites: {
        Row: {
          admin_url: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          owner_id: string
          plugins_count: number | null
          site_url: string
          status: Database["public"]["Enums"]["health_status"]
          synced_at: string | null
          theme: string | null
          wp_version: string | null
        }
        Insert: {
          admin_url?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          plugins_count?: number | null
          site_url: string
          status?: Database["public"]["Enums"]["health_status"]
          synced_at?: string | null
          theme?: string | null
          wp_version?: string | null
        }
        Update: {
          admin_url?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          plugins_count?: number | null
          site_url?: string
          status?: Database["public"]["Enums"]["health_status"]
          synced_at?: string | null
          theme?: string | null
          wp_version?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      automation_status: "enabled" | "disabled" | "mock"
      client_status: "active" | "inactive" | "prospect"
      connector_status: "connected" | "mock" | "missing"
      deploy_provider: "vercel" | "netlify" | "cloudflare"
      deploy_status: "ready" | "building" | "error" | "queued" | "mock"
      followup_status: "pending" | "done" | "skipped"
      health_status: "healthy" | "warning" | "error" | "mock"
      lead_status:
        | "new"
        | "approved"
        | "rejected"
        | "contacted"
        | "follow_up_due"
        | "replied"
        | "won"
        | "lost"
      log_status: "success" | "warning" | "error" | "info"
      message_source: "imessage" | "sms" | "whatsapp" | "email" | "manual"
      message_status: "new" | "converted" | "ignored"
      priority: "low" | "medium" | "high"
      project_status:
        | "idea"
        | "planned"
        | "active"
        | "paused"
        | "shipped"
        | "maintenance"
        | "archived"
      repo_provider: "github" | "gitlab" | "bitbucket"
      score_label: "KEEP" | "BORDERLINE" | "REJECTED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      automation_status: ["enabled", "disabled", "mock"],
      client_status: ["active", "inactive", "prospect"],
      connector_status: ["connected", "mock", "missing"],
      deploy_provider: ["vercel", "netlify", "cloudflare"],
      deploy_status: ["ready", "building", "error", "queued", "mock"],
      followup_status: ["pending", "done", "skipped"],
      health_status: ["healthy", "warning", "error", "mock"],
      lead_status: [
        "new",
        "approved",
        "rejected",
        "contacted",
        "follow_up_due",
        "replied",
        "won",
        "lost",
      ],
      log_status: ["success", "warning", "error", "info"],
      message_source: ["imessage", "sms", "whatsapp", "email", "manual"],
      message_status: ["new", "converted", "ignored"],
      priority: ["low", "medium", "high"],
      project_status: [
        "idea",
        "planned",
        "active",
        "paused",
        "shipped",
        "maintenance",
        "archived",
      ],
      repo_provider: ["github", "gitlab", "bitbucket"],
      score_label: ["KEEP", "BORDERLINE", "REJECTED"],
    },
  },
} as const
