import { PRIORITY_LOOKUP, STATUS_LOOKUP, type ImportFieldKey } from "@/lib/import/field-config";
import type { LeadPriority, LeadStatus } from "@/lib/constants";

export type ImportRowData = {
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  lead_source_name: string | null;
  priority: LeadPriority;
  status: LeadStatus;
  property_type_name: string | null;
  preferred_area: string | null;
  budget_min: number | null;
  budget_max: number | null;
  bedrooms: number | null;
  next_follow_up_at: string | null;
  assigned_to: string | null;
  notes: string | null;
};

export type ImportRowResult = {
  rowIndex: number;
  errors: string[];
  data: ImportRowData | null;
  isNewSource: boolean;
  isNewPropertyType: boolean;
  agentUnmatched: boolean;
};

function field(
  row: Record<string, string>,
  mapping: Partial<Record<ImportFieldKey, string>>,
  key: ImportFieldKey
): string {
  const header = mapping[key];
  if (!header) return "";
  return (row[header] ?? "").toString().trim();
}

function parseNumber(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.-]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function validateImportRow(
  row: Record<string, string>,
  rowIndex: number,
  mapping: Partial<Record<ImportFieldKey, string>>,
  existingSourceNames: Set<string>,
  existingPropertyTypeNames: Set<string>,
  /** lowercased full_name -> profile id */
  agentIdsByName: Map<string, string>
): ImportRowResult {
  const errors: string[] = [];

  const first_name = field(row, mapping, "first_name");
  const last_name = field(row, mapping, "last_name");
  if (!first_name) errors.push("Missing first name");
  if (!last_name) errors.push("Missing last name");

  const emailRaw = field(row, mapping, "email");
  if (emailRaw && !/^\S+@\S+\.\S+$/.test(emailRaw)) {
    errors.push(`Invalid email "${emailRaw}"`);
  }

  const priorityRaw = field(row, mapping, "priority");
  const priority = priorityRaw
    ? PRIORITY_LOOKUP.get(priorityRaw.toLowerCase())
    : "Warm";
  if (priorityRaw && !priority) errors.push(`Unrecognized priority "${priorityRaw}"`);

  const statusRaw = field(row, mapping, "status");
  const status = statusRaw ? STATUS_LOOKUP.get(statusRaw.toLowerCase()) : "New Lead";
  if (statusRaw && !status) errors.push(`Unrecognized status "${statusRaw}"`);

  const budgetMinRaw = field(row, mapping, "budget_min");
  const budgetMaxRaw = field(row, mapping, "budget_max");
  const budget_min = parseNumber(budgetMinRaw);
  const budget_max = parseNumber(budgetMaxRaw);
  if (budgetMinRaw && budget_min == null) errors.push(`Invalid budget min "${budgetMinRaw}"`);
  if (budgetMaxRaw && budget_max == null) errors.push(`Invalid budget max "${budgetMaxRaw}"`);
  if (budget_min != null && budget_max != null && budget_min > budget_max) {
    errors.push("Budget min is greater than budget max");
  }

  const bedroomsRaw = field(row, mapping, "bedrooms");
  const bedrooms = parseNumber(bedroomsRaw);
  if (bedroomsRaw && bedrooms == null) errors.push(`Invalid bedrooms "${bedroomsRaw}"`);

  const followUpRaw = field(row, mapping, "next_follow_up_at");
  const next_follow_up_at = followUpRaw ? parseDate(followUpRaw) : null;
  if (followUpRaw && !next_follow_up_at) {
    errors.push(`Unrecognized date "${followUpRaw}"`);
  }

  const lead_source_name = field(row, mapping, "lead_source") || null;
  const isNewSource = !!lead_source_name && !existingSourceNames.has(lead_source_name.toLowerCase());

  const property_type_name = field(row, mapping, "property_type") || null;
  const isNewPropertyType =
    !!property_type_name && !existingPropertyTypeNames.has(property_type_name.toLowerCase());

  const agentRaw = field(row, mapping, "assigned_agent");
  const matchedAgentId = agentRaw ? agentIdsByName.get(agentRaw.toLowerCase()) : undefined;
  const agentUnmatched = !!agentRaw && !matchedAgentId;

  if (errors.length > 0) {
    return { rowIndex, errors, data: null, isNewSource, isNewPropertyType, agentUnmatched };
  }

  return {
    rowIndex,
    errors,
    isNewSource,
    isNewPropertyType,
    agentUnmatched,
    data: {
      first_name,
      last_name,
      phone: field(row, mapping, "phone") || null,
      email: emailRaw || null,
      lead_source_name,
      priority: (priority ?? "Warm") as LeadPriority,
      status: (status ?? "New Lead") as LeadStatus,
      property_type_name,
      preferred_area: field(row, mapping, "preferred_area") || null,
      budget_min,
      budget_max,
      bedrooms,
      next_follow_up_at,
      assigned_to: matchedAgentId ?? null,
      notes: field(row, mapping, "notes") || null,
    },
  };
}
