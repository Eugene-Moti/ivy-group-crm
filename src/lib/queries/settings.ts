import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_LEAD_COLUMN_LABELS,
  DEFAULT_STATUS_LABELS,
  type LeadColumnId,
  type LeadStatus,
} from "@/lib/constants";
import type { Database } from "@/types/database.types";

export type CampaignRow = Database["public"]["Tables"]["campaigns"]["Row"];
export type CampaignWithSource = CampaignRow & {
  lead_source: { id: string; name: string } | null;
};

export async function getCampaigns(): Promise<CampaignWithSource[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("campaigns")
    .select("*, lead_source:lead_sources(id, name)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CampaignWithSource[];
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function getAllProfiles(): Promise<ProfileRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("full_name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type LeadColumnLabels = Record<LeadColumnId, string>;

export async function getLeadColumnLabels(): Promise<LeadColumnLabels> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("lead_column_labels").select("*");

  if (error) throw new Error(error.message);

  const labels = { ...DEFAULT_LEAD_COLUMN_LABELS } as LeadColumnLabels;
  for (const row of data ?? []) {
    if (row.column_id in labels) {
      labels[row.column_id as LeadColumnId] = row.label;
    }
  }
  return labels;
}

export type StatusLabels = Record<LeadStatus, string>;

export async function getStatusLabels(): Promise<StatusLabels> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("status_labels").select("*");

  if (error) throw new Error(error.message);

  const labels = { ...DEFAULT_STATUS_LABELS };
  for (const row of data ?? []) {
    labels[row.status] = row.label;
  }
  return labels;
}
