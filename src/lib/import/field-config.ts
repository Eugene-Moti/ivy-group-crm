import { LEAD_PRIORITIES, LEAD_STATUSES } from "@/lib/constants";

export type ImportFieldKey =
  | "first_name"
  | "last_name"
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
  { key: "first_name", label: "First Name", required: true, aliases: ["first name", "firstname", "fname", "first"] },
  { key: "last_name", label: "Last Name", required: true, aliases: ["last name", "lastname", "lname", "surname", "last"] },
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
  { key: "next_follow_up_at", label: "Next Follow-Up", required: false, aliases: ["next follow-up", "next follow up", "follow up date", "followup"] },
  { key: "assigned_agent", label: "Assigned Agent", required: false, aliases: ["assigned agent", "agent", "assigned to", "owner"] },
  { key: "notes", label: "Notes", required: false, aliases: ["notes", "note", "comments", "remarks"] },
];

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
