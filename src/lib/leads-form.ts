import { format } from "date-fns";
import { NEW_LEAD_STATUS_KEY } from "@/lib/constants";
import type { LeadFormValues } from "@/lib/validations/lead";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { Database } from "@/types/database.types";

type LeadInsertOrUpdate = Database["public"]["Tables"]["leads"]["Insert"];

export function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return "";
  return format(new Date(value), "yyyy-MM-dd'T'HH:mm");
}

export function leadFormDefaults(
  lead: LeadWithRelations | undefined
): Partial<LeadFormValues> {
  if (!lead) {
    return {
      priority: "Warm",
      status: NEW_LEAD_STATUS_KEY,
      lead_type: "Direct Client",
      created_at: format(new Date(), "yyyy-MM-dd"),
    };
  }
  return {
    first_name: lead.first_name,
    last_name: lead.last_name,
    phone: lead.phone ?? undefined,
    email: lead.email ?? undefined,
    lead_source_id: lead.lead_source_id ?? undefined,
    campaign_id: lead.campaign_id ?? undefined,
    priority: lead.priority,
    status: lead.status,
    lead_type: lead.lead_type,
    referred_by_lead_id: lead.referred_by_lead_id ?? undefined,
    property_type_id: lead.property_type_id ?? undefined,
    preferred_area: lead.preferred_area ?? undefined,
    budget_min: lead.budget_min != null ? String(lead.budget_min) : undefined,
    budget_max: lead.budget_max != null ? String(lead.budget_max) : undefined,
    bedrooms: lead.bedrooms != null ? String(lead.bedrooms) : undefined,
    created_at: format(new Date(lead.created_at), "yyyy-MM-dd"),
    next_follow_up_at: toDatetimeLocal(lead.next_follow_up_at),
    assigned_to: lead.assigned_to ?? undefined,
    notes: lead.notes ?? undefined,
  };
}

export function buildLeadPayload(values: LeadFormValues): LeadInsertOrUpdate {
  const blankToNull = (v: string | undefined) => (v && v.trim() ? v : null);
  const numberOrNull = (v: string | undefined) =>
    v && v.trim() !== "" ? Number(v) : null;
  const noneToNull = (v: string | undefined) => (v && v !== "none" ? v : null);

  return {
    first_name: values.first_name,
    last_name: values.last_name,
    phone: blankToNull(values.phone),
    email: blankToNull(values.email),
    lead_source_id: noneToNull(values.lead_source_id),
    campaign_id: noneToNull(values.campaign_id),
    priority: values.priority,
    status: values.status,
    lead_type: values.lead_type,
    referred_by_lead_id: noneToNull(values.referred_by_lead_id),
    property_type_id: noneToNull(values.property_type_id),
    preferred_area: blankToNull(values.preferred_area),
    budget_min: numberOrNull(values.budget_min),
    budget_max: numberOrNull(values.budget_max),
    bedrooms: numberOrNull(values.bedrooms),
    created_at: values.created_at ? new Date(values.created_at).toISOString() : undefined,
    next_follow_up_at: values.next_follow_up_at
      ? new Date(values.next_follow_up_at).toISOString()
      : null,
    assigned_to: noneToNull(values.assigned_to),
    notes: blankToNull(values.notes),
  };
}
