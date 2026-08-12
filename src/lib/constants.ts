/**
 * Pipeline stages are admin-manageable (Settings > Pipeline stages,
 * pipeline_stages table) rather than a fixed set — so LeadStatus is just a
 * stable text key now, not a literal union. Three keys are structurally
 * fixed (protected from deletion at the DB level) because reporting logic
 * depends on them always existing:
 */
export type LeadStatus = string;
export const NEW_LEAD_STATUS_KEY = "new_lead";
export const WON_STATUS_KEY = "closed_won";
export const LOST_STATUS_KEY = "closed_lost";
export const CLOSED_STATUS_KEYS: LeadStatus[] = [WON_STATUS_KEY, LOST_STATUS_KEY];

/** Where a resolved agent (referral moved to an active client record) sits — not a deal in progress anymore, but not closed either. */
export const REFERRED_CLIENT_ACTIVE_STATUS_KEY = "referred_client_active";

/**
 * Statuses that shouldn't generate a follow-up reminder: closed deals, and
 * resolved agents (their own card isn't the active tracking record for a
 * deal anymore — the referred client's is, so a leftover follow-up date on
 * the agent's card would just be a confusing duplicate of the client's).
 */
export const FOLLOW_UP_EXCLUDED_STATUS_KEYS: LeadStatus[] = [
  ...CLOSED_STATUS_KEYS,
  REFERRED_CLIENT_ACTIVE_STATUS_KEY,
];

export const LEAD_PRIORITIES = ["Hot", "Warm", "Cold"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

/**
 * Most leads are direct buyers, but some inbound contacts turn out to be
 * real estate agents bringing their own clients. They're still leads —
 * same pipeline, same stages, can still close — just tagged so the team can
 * tell them apart and filter to just one kind.
 */
export const LEAD_TYPES = ["Direct Client", "Real Estate Agent"] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

export const ACTIVITY_TYPES = [
  "note",
  "call",
  "email",
  "whatsapp",
  "viewing",
  "status_change",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/** Why a lead was marked Closed - Lost — captured at the moment it happens, so losses become patterns instead of dead ends. */
export const LOST_REASONS = [
  "Budget mismatch",
  "Chose a competitor",
  "Unresponsive",
  "Changed mind",
  "Financing fell through",
  "Other",
] as const;
export type LostReason = (typeof LOST_REASONS)[number];

/** Hex colors for lead priority — used for badges and charts. */
export const PRIORITY_COLORS: Record<LeadPriority, string> = {
  Hot: "#E4572E",
  Warm: "#F2C14E",
  Cold: "#4A90C2",
};

/**
 * Default leads-table column header labels, keyed by column id. Admins can
 * override these from Settings (lead_column_labels table); a column id
 * missing from the database falls back to its default here, so adding a new
 * column never requires a migration just to seed a label for it.
 */
export const DEFAULT_LEAD_COLUMN_LABELS = {
  name: "Name",
  lead_type: "Lead type",
  phone: "Phone",
  email: "Email",
  source: "Source",
  priority: "Priority",
  status: "Status",
  property_type: "Project",
  area: "Location",
  budget: "Budget",
  bedrooms: "Beds",
  last_contact_at: "Last contact",
  next_follow_up_at: "Next follow-up",
  agent: "Sales manager",
  created_at: "Date of inquiry",
} as const;

export type LeadColumnId = keyof typeof DEFAULT_LEAD_COLUMN_LABELS;
