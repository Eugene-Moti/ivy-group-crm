import { format } from "date-fns";
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
    return { priority: "Warm", status: "New Lead" };
  }
  return {
    first_name: lead.first_name,
    last_name: lead.last_name,
    phone: lead.phone ?? undefined,
    email: lead.email ?? undefined,
    lead_source_id: lead.lead_source_id ?? undefined,
    priority: lead.priority,
    status: lead.status,
    property_type_id: lead.property_type_id ?? undefined,
    preferred_area: lead.preferred_area ?? undefined,
    budget_min: lead.budget_min != null ? String(lead.budget_min) : undefined,
    budget_max: lead.budget_max != null ? String(lead.budget_max) : undefined,
    bedrooms: lead.bedrooms != null ? String(lead.bedrooms) : undefined,
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
    priority: values.priority,
    status: values.status,
    property_type_id: noneToNull(values.property_type_id),
    preferred_area: blankToNull(values.preferred_area),
    budget_min: numberOrNull(values.budget_min),
    budget_max: numberOrNull(values.budget_max),
    bedrooms: numberOrNull(values.bedrooms),
    next_follow_up_at: values.next_follow_up_at
      ? new Date(values.next_follow_up_at).toISOString()
      : null,
    assigned_to: noneToNull(values.assigned_to),
    notes: blankToNull(values.notes),
  };
}
