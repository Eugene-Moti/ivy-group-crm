import {
  DEFAULT_LEAD_COLUMN_LABELS,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  type LeadColumnId,
} from "@/lib/constants";
import type { LeadColumnLabels } from "@/lib/queries/settings";

export type ImportFieldKey =
  | "first_name"
  | "last_name"
  | "full_name"
  | "phone"
  | "email"
  | "lead_source"
  | "priority"
  | "status"
  | "property_type"
  | "preferred_area"
  | "budget_min"
  | "budget_max"
  | "bedrooms"
  | "last_contact_at"
  | "next_follow_up_at"
  | "assigned_agent"
  | "notes";

export type ImportFieldConfig = {
  key: ImportFieldKey;
  label: string;
  required: boolean;
  aliases: string[];
};

export const IMPORT_FIELDS: ImportFieldConfig[] = [
  { key: "first_name", label: "First Name", required: false, aliases: ["first name", "firstname", "fname", "first"] },
  { key: "last_name", label: "Last Name", required: false, aliases: ["last name", "lastname", "lname", "surname", "last"] },
  {
    key: "full_name",
    label: "Full Name",
    required: false,
    aliases: ["full name", "fullname", "name", "client name", "customer name", "lead name", "contact name"],
  },
  { key: "phone", label: "Phone", required: false, aliases: ["phone", "phone number", "mobile", "cell", "tel"] },
  { key: "email", label: "Email", required: false, aliases: ["email", "email address", "e-mail"] },
  { key: "lead_source", label: "Lead Source", required: false, aliases: ["lead source", "source", "channel"] },
  { key: "priority", label: "Priority", required: false, aliases: ["priority", "lead priority", "temperature"] },
  { key: "status", label: "Pipeline Status", required: false, aliases: ["pipeline status", "status", "stage", "lead status"] },
  { key: "property_type", label: "Property Type", required: false, aliases: ["property type", "type", "property"] },
  { key: "preferred_area", label: "Preferred Area", required: false, aliases: ["preferred area", "area", "location", "neighborhood", "neighbourhood"] },
  { key: "budget_min", label: "Budget Min", required: false, aliases: ["budget min", "min budget", "budget (min)", "minimum budget"] },
  { key: "budget_max", label: "Budget Max", required: false, aliases: ["budget max", "max budget", "budget (max)", "maximum budget"] },
  { key: "bedrooms", label: "Beds", required: false, aliases: ["beds", "bedrooms", "no. of beds", "# beds"] },
  {
    key: "last_contact_at",
    label: "Last Contacted",
    required: false,
    aliases: [
      "last contact",
      "last contacted",
      "date contacted",
      "contact date",
      "first contact",
      "first contacted",
      "date of first contact",
    ],
  },
  { key: "next_follow_up_at", label: "Next Follow-Up", required: false, aliases: ["next follow-up", "next follow up", "follow up date", "followup"] },
  { key: "assigned_agent", label: "Sales Manager", required: false, aliases: ["assigned agent", "agent", "assigned to", "owner", "sales manager", "manager"] },
  { key: "notes", label: "Notes", required: false, aliases: ["notes", "note", "comments", "remarks"] },
];

/**
 * Most import fields correspond 1:1 to a leads-table column, so if an admin
 * renamed that column from Settings > Column labels, the import step should
 * say the same thing. first_name/last_name have no direct match — the leads
 * table shows them combined as one "Name"-ish column — so they're handled
 * separately in resolveImportFieldLabel below.
 */
const IMPORT_FIELD_TO_COLUMN_ID: Partial<Record<ImportFieldKey, LeadColumnId>> = {
  phone: "phone",
  email: "email",
  lead_source: "source",
  priority: "priority",
  status: "status",
  property_type: "property_type",
  preferred_area: "area",
  budget_min: "budget",
  budget_max: "budget",
  bedrooms: "bedrooms",
  last_contact_at: "last_contact_at",
  next_follow_up_at: "next_follow_up_at",
  assigned_agent: "agent",
};

/** The label to show for an import field, and an optional note tying it back to a renamed column. */
export function resolveImportFieldLabel(
  field: ImportFieldConfig,
  columnLabels?: LeadColumnLabels
): { label: string; note?: string } {
  if (field.key === "last_contact_at") {
    return {
      label: field.label,
      note: "Also used as this lead's \"created\" date, so it won't count as new this week.",
    };
  }

  if (!columnLabels) return { label: field.label };

  if (field.key === "first_name" || field.key === "last_name" || field.key === "full_name") {
    const nameLabel = columnLabels.name;
    if (nameLabel !== DEFAULT_LEAD_COLUMN_LABELS.name) {
      return { label: field.label, note: `Together, shown as "${nameLabel}"` };
    }
    return { label: field.label };
  }

  const columnId = IMPORT_FIELD_TO_COLUMN_ID[field.key];
  if (!columnId) return { label: field.label };

  const customLabel = columnLabels[columnId];
  if (!customLabel || customLabel === DEFAULT_LEAD_COLUMN_LABELS[columnId]) {
    return { label: field.label };
  }
  return { label: customLabel };
}

/**
 * A name is mappable two ways: separate First Name + Last Name columns, or
 * one combined Full Name column. Either satisfies the requirement.
 */
export function isNameMappingComplete(mapping: Partial<Record<ImportFieldKey, string>>): boolean {
  return !!mapping.full_name || (!!mapping.first_name && !!mapping.last_name);
}

/** First word is the first name, everything after is the last name. */
export function splitFullName(raw: string): { first_name: string; last_name: string } {
  const parts = raw.trim().split(/\s+/);
  if (parts.length <= 1) return { first_name: parts[0] ?? "", last_name: "" };
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");
}

/** Best-guess mapping from spreadsheet headers to our field keys, by exact/alias match. */
export function autoMapHeaders(headers: string[]): Partial<Record<ImportFieldKey, string>> {
  const mapping: Partial<Record<ImportFieldKey, string>> = {};
  const usedHeaders = new Set<string>();

  for (const field of IMPORT_FIELDS) {
    const candidates = [normalize(field.label), ...field.aliases.map(normalize)];
    const match = headers.find(
      (h) => !usedHeaders.has(h) && candidates.includes(normalize(h))
    );
    if (match) {
      mapping[field.key] = match;
      usedHeaders.add(match);
    }
  }

  return mapping;
}

function toEnumLookup(values: readonly string[]): Map<string, string> {
  return new Map(values.map((v) => [v.toLowerCase().trim(), v]));
}

export const PRIORITY_LOOKUP = toEnumLookup(LEAD_PRIORITIES);
export const STATUS_LOOKUP = toEnumLookup(LEAD_STATUSES);
