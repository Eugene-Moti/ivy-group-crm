import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type ActivityRow = Database["public"]["Tables"]["activities"]["Row"];

export type ActivityWithAuthor = ActivityRow & {
  author: { id: string; full_name: string | null } | null;
};

export type ActivityWithLeadAndAuthor = ActivityWithAuthor & {
  lead: { id: string; first_name: string; last_name: string } | null;
};

export async function getRecentActivities(
  limit: number
): Promise<ActivityWithLeadAndAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select(
      "*, author:profiles!activities_created_by_fkey(id, full_name), lead:leads(id, first_name, last_name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ActivityWithLeadAndAuthor[];
}

export async function getActivities(leadId: string): Promise<ActivityWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("*, author:profiles!activities_created_by_fkey(id, full_name)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ActivityWithAuthor[];
}

/** Lead id + type for every logged activity — lightweight, for report-wide coverage insights rather than per-lead detail. */
export async function getAllActivitySummaries(): Promise<
  Pick<ActivityRow, "lead_id" | "type" | "created_at">[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("activities").select("lead_id, type, created_at");

  if (error) throw new Error(error.message);
  return data ?? [];
}
