/**
 * Hand-authored to match supabase/migrations/20260725000000_init_schema.sql.
 * Regenerate with `supabase gen types typescript --project-id <ref> --schema public`
 * after schema changes, if you'd rather not hand-edit this.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "admin" | "viewer";
export type LeadPriority = "Hot" | "Warm" | "Cold";
/** Pipeline stage — a stable text key referencing pipeline_stages.key, not a fixed enum. */
export type LeadStatus = string;
export type ActivityType =
  | "note"
  | "call"
  | "email"
  | "whatsapp"
  | "viewing"
  | "status_change";
export type LeadType = "Direct Client" | "Real Estate Agent";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          avatar_url: string | null;
          role: UserRole;
          display_name: string | null;
          job_title: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          display_name?: string | null;
          job_title?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          display_name?: string | null;
          job_title?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      lead_sources: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      property_types: {
        Row: {
          id: string;
          name: string;
          location: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          location?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          location?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sales_agents: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          email: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      lead_column_labels: {
        Row: {
          column_id: string;
          label: string;
        };
        Insert: {
          column_id: string;
          label: string;
        };
        Update: {
          column_id?: string;
          label?: string;
        };
        Relationships: [];
      };
      pipeline_stages: {
        Row: {
          key: string;
          label: string;
          color: string;
          sort_order: number;
          is_protected: boolean;
          created_at: string;
        };
        Insert: {
          key: string;
          label: string;
          color?: string;
          sort_order: number;
          is_protected?: boolean;
          created_at?: string;
        };
        Update: {
          key?: string;
          label?: string;
          color?: string;
          sort_order?: number;
          is_protected?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          name: string;
          lead_source_id: string | null;
          channel: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          lead_source_id?: string | null;
          channel?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          lead_source_id?: string | null;
          channel?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_lead_source_id_fkey";
            columns: ["lead_source_id"];
            isOneToOne: false;
            referencedRelation: "lead_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          phone: string | null;
          email: string | null;
          lead_source_id: string | null;
          campaign_id: string | null;
          priority: LeadPriority;
          status: LeadStatus;
          property_type_id: string | null;
          preferred_area: string | null;
          budget_min: number | null;
          budget_max: number | null;
          bedrooms: number | null;
          last_contact_at: string | null;
          next_follow_up_at: string | null;
          assigned_to: string | null;
          notes: string | null;
          lead_type: LeadType;
          referred_by_lead_id: string | null;
          lost_reason: string | null;
          lost_reason_note: string | null;
          is_private: boolean;
          codename: string | null;
          confidential_brief: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          phone?: string | null;
          email?: string | null;
          lead_source_id?: string | null;
          campaign_id?: string | null;
          priority?: LeadPriority;
          status?: LeadStatus;
          property_type_id?: string | null;
          preferred_area?: string | null;
          budget_min?: number | null;
          budget_max?: number | null;
          bedrooms?: number | null;
          last_contact_at?: string | null;
          next_follow_up_at?: string | null;
          assigned_to?: string | null;
          notes?: string | null;
          lead_type?: LeadType;
          referred_by_lead_id?: string | null;
          lost_reason?: string | null;
          lost_reason_note?: string | null;
          is_private?: boolean;
          codename?: string | null;
          confidential_brief?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          email?: string | null;
          lead_source_id?: string | null;
          campaign_id?: string | null;
          priority?: LeadPriority;
          status?: LeadStatus;
          property_type_id?: string | null;
          preferred_area?: string | null;
          budget_min?: number | null;
          budget_max?: number | null;
          bedrooms?: number | null;
          last_contact_at?: string | null;
          next_follow_up_at?: string | null;
          assigned_to?: string | null;
          notes?: string | null;
          lead_type?: LeadType;
          referred_by_lead_id?: string | null;
          lost_reason?: string | null;
          lost_reason_note?: string | null;
          is_private?: boolean;
          codename?: string | null;
          confidential_brief?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_lead_source_id_fkey";
            columns: ["lead_source_id"];
            isOneToOne: false;
            referencedRelation: "lead_sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_property_type_id_fkey";
            columns: ["property_type_id"];
            isOneToOne: false;
            referencedRelation: "property_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "sales_agents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_referred_by_lead_id_fkey";
            columns: ["referred_by_lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leads_status_fkey";
            columns: ["status"];
            isOneToOne: false;
            referencedRelation: "pipeline_stages";
            referencedColumns: ["key"];
          },
        ];
      };
      activities: {
        Row: {
          id: string;
          lead_id: string;
          type: ActivityType;
          body: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          type: ActivityType;
          body?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          type?: ActivityType;
          body?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activities_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_evidence: {
        Row: {
          id: string;
          lead_id: string;
          occurred_at: string;
          note: string | null;
          file_path: string | null;
          file_name: string | null;
          file_type: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          occurred_at?: string;
          note?: string | null;
          file_path?: string | null;
          file_name?: string | null;
          file_type?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          occurred_at?: string;
          note?: string | null;
          file_path?: string | null;
          file_name?: string | null;
          file_type?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_evidence_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_evidence_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      lead_documents: {
        Row: {
          id: string;
          lead_id: string;
          document_type: string;
          note: string | null;
          file_path: string;
          file_name: string;
          file_type: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          document_type: string;
          note?: string | null;
          file_path: string;
          file_name: string;
          file_type?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          document_type?: string;
          note?: string | null;
          file_path?: string;
          file_name?: string;
          file_type?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lead_documents_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lead_documents_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      units_sold: {
        Row: {
          id: string;
          lead_id: string;
          unit_number: string;
          unit_size: string | null;
          sale_type: string;
          unit_amount: number;
          bonus_amount: number;
          bonus_paid: boolean;
          sold_at: string;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          unit_number: string;
          unit_size?: string | null;
          sale_type: string;
          unit_amount: number;
          bonus_amount?: number;
          bonus_paid?: boolean;
          sold_at?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          unit_number?: string;
          unit_size?: string | null;
          sale_type?: string;
          unit_amount?: number;
          bonus_amount?: number;
          bonus_paid?: boolean;
          sold_at?: string;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "units_sold_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "units_sold_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_queries: {
        Row: {
          id: string;
          name: string;
          filters: Json;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          filters?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          filters?: Json;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_queries_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      private_lead_access: {
        Row: {
          user_id: string;
          is_owner: boolean;
          granted_by: string | null;
          granted_at: string;
        };
        Insert: {
          user_id: string;
          is_owner?: boolean;
          granted_by?: string | null;
          granted_at?: string;
        };
        Update: {
          user_id?: string;
          is_owner?: boolean;
          granted_by?: string | null;
          granted_at?: string;
        };
        Relationships: [];
      };
      private_area_credentials: {
        Row: {
          user_id: string;
          pin_hash: string | null;
          pin_set_at: string | null;
          failed_attempts: number;
          locked_until: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          pin_hash?: string | null;
          pin_set_at?: string | null;
          failed_attempts?: number;
          locked_until?: string | null;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          pin_hash?: string | null;
          pin_set_at?: string | null;
          failed_attempts?: number;
          locked_until?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      private_webauthn_credentials: {
        Row: {
          credential_id: string;
          user_id: string;
          public_key: string;
          counter: number;
          transports: string[] | null;
          device_label: string | null;
          created_at: string;
          last_used_at: string | null;
        };
        Insert: {
          credential_id: string;
          user_id: string;
          public_key: string;
          counter?: number;
          transports?: string[] | null;
          device_label?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Update: {
          credential_id?: string;
          user_id?: string;
          public_key?: string;
          counter?: number;
          transports?: string[] | null;
          device_label?: string | null;
          created_at?: string;
          last_used_at?: string | null;
        };
        Relationships: [];
      };
      private_access_log: {
        Row: {
          id: string;
          user_id: string | null;
          lead_id: string | null;
          action: string;
          detail: Json | null;
          at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          lead_id?: string | null;
          action: string;
          detail?: Json | null;
          at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          lead_id?: string | null;
          action?: string;
          detail?: Json | null;
          at?: string;
        };
        Relationships: [];
      };
      auth_2fa_codes: {
        Row: {
          user_id: string;
          code_hash: string;
          expires_at: string;
          attempts: number;
          last_sent_at: string;
          sends_in_window: number;
          window_start: string;
        };
        Insert: {
          user_id: string;
          code_hash: string;
          expires_at: string;
          attempts?: number;
          last_sent_at?: string;
          sends_in_window?: number;
          window_start?: string;
        };
        Update: {
          user_id?: string;
          code_hash?: string;
          expires_at?: string;
          attempts?: number;
          last_sent_at?: string;
          sends_in_window?: number;
          window_start?: string;
        };
        Relationships: [];
      };
      auth_2fa_log: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          detail: Json | null;
          at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          detail?: Json | null;
          at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          detail?: Json | null;
          at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      has_private_access: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_private_owner: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      lead_priority: LeadPriority;
      activity_type: ActivityType;
    };
    CompositeTypes: Record<string, never>;
  };
}
