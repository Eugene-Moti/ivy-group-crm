import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import type { Database } from "@/types/database.types";

export type LeadRow = Database["public"]["Tables"]["leads"]["Row"];

export type LeadWithRelations = LeadRow & {
  lead_source: { id: string; name: string } | null;
  property_type: { id: string; name: string; location: string | null } | null;
  assigned_agent: { id: string; name: string; phone: string | null; email: string | null } | null;
  referred_by: { id: string; first_name: string; last_name: string } | null;
};

/** Exported for callers that need every lead via a client this module doesn't construct itself — e.g. the digest cron route, which runs with no request/cookies and uses the service-role admin client instead. */
export const LEAD_SELECT =
  "*, lead_source:lead_sources(id, name), property_type:property_types(id, name, location), assigned_agent:sales_agents!leads_assigned_to_fkey(id, name, phone, email), referred_by:leads!referred_by_lead_id(id, first_name, last_name)";

/**
 * Phone/email are for admins only — viewers get everything else about a
 * lead, just not direct contact details. Masked here, at the source, so
 * every reader (Table, Kanban, detail page, Follow-ups, Reports, CSV/Excel
 * export) inherits it automatically instead of needing per-screen checks.
 */
async function maskForViewer<T extends LeadWithRelations | LeadWithRelations[]>(
  leads: T
): Promise<T> {
  const profile = await getCurrentProfile();
  if (isAdmin(profile)) return leads;

  const mask = (lead: LeadWithRelations): LeadWithRelations => ({
    ...lead,
    phone: null,
    email: null,
  });

  return (Array.isArray(leads) ? leads.map(mask) : mask(leads)) as T;
}

export async function getLeads(): Promise<LeadWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return maskForViewer((data ?? []) as unknown as LeadWithRelations[]);
}

export async function getLead(id: string): Promise<LeadWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return maskForViewer(data as unknown as LeadWithRelations);
}

export async function getLeadSources() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_sources")
    .select("id, name")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPropertyTypes() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("property_types")
    .select("id, name, location")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getAgents() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_agents")
    .select("id, name, phone, email")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Leads tagged as "Real Estate Agent" — for the "Referred by" picker on other leads. */
export async function getAgentLeads() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, first_name, last_name")
    .eq("lead_type", "Real Estate Agent")
    .order("first_name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Buyer leads that name this agent lead as their referrer. */
export async function getReferredLeads(agentLeadId: string): Promise<LeadWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("referred_by_lead_id", agentLeadId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return maskForViewer((data ?? []) as unknown as LeadWithRelations[]);
}
