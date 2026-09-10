import "server-only";
import { createClient } from "@/lib/supabase/server";
import { LEAD_SELECT, type LeadWithRelations } from "@/lib/queries/leads";

/**
 * Private clients only. RLS already hides these rows from anyone off the
 * allowlist, so the explicit is_private filter here is what keeps them OUT
 * of the shared lists for people who ARE on the allowlist — the two halves
 * of "walled off both ways".
 */
export async function getPrivateLeads(): Promise<LeadWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("is_private", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LeadWithRelations[];
}

export async function getPrivateLead(id: string): Promise<LeadWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", id)
    .eq("is_private", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as unknown as LeadWithRelations) ?? null;
}

export type PrivateAccessLogRow = {
  id: string;
  user_id: string | null;
  lead_id: string | null;
  action: string;
  detail: Record<string, unknown> | null;
  at: string;
  actor: { display_name: string | null; full_name: string | null; email: string | null } | null;
  lead: { first_name: string; last_name: string; codename: string | null } | null;
};

/** The full audit log — RLS restricts SELECT to the owner. */
export async function getPrivateAccessLog(limit = 200): Promise<PrivateAccessLogRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("private_access_log")
    .select(
      "id, user_id, lead_id, action, detail, at, actor:profiles!private_access_log_user_id_fkey(display_name, full_name, email), lead:leads!private_access_log_lead_id_fkey(first_name, last_name, codename)"
    )
    .order("at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as PrivateAccessLogRow[];
}
