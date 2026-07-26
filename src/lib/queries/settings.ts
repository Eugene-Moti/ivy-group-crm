import "server-only";
import { createClient } from "@/lib/supabase/server";
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
