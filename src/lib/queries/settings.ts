import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LEAD_COLUMN_LABELS, type LeadColumnId } from "@/lib/constants";
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

/**
 * How many activities (calls, notes, status changes, …) each team member
 * has logged so far this calendar month — keyed by profile id. Deliberately
 * *not* "deals closed": sales_agents (who a lead is assigned to) are a
 * separate lookup table for people who never log into the CRM at all, so
 * the only honest per-login-user performance signal is what they've
 * actually done in the system.
 */
export async function getMonthlyActivityCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("activities")
    .select("created_by")
    .gte("created_at", monthStart.toISOString())
    .not("created_by", "is", null);

  if (error) throw new Error(error.message);

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (!row.created_by) continue;
    counts[row.created_by] = (counts[row.created_by] ?? 0) + 1;
  }
  return counts;
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

export type PipelineStage = Database["public"]["Tables"]["pipeline_stages"]["Row"];

export async function getPipelineStages(): Promise<PipelineStage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("*")
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data ?? [];
}
