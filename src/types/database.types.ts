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
export type LeadStatus =
  | "New Lead"
  | "Contacted"
  | "Qualified"
  | "Viewing Scheduled"
  | "Negotiating"
  | "Offer Made"
  | "Closed - Won"
  | "Closed - Lost"
  | "On Hold";
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
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
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
      status_labels: {
        Row: {
          status: LeadStatus;
          label: string;
        };
        Insert: {
          status: LeadStatus;
          label: string;
        };
        Update: {
          status?: LeadStatus;
          label?: string;
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
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      lead_priority: LeadPriority;
      lead_status: LeadStatus;
      activity_type: ActivityType;
    };
    CompositeTypes: Record<string, never>;
  };
}
