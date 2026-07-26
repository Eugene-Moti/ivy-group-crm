export const LEAD_STATUSES = [
  "New Lead",
  "Contacted",
  "Qualified",
  "Viewing Scheduled",
  "Negotiating",
  "Offer Made",
  "Closed - Won",
  "Closed - Lost",
  "On Hold",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_PRIORITIES = ["Hot", "Warm", "Cold"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const ACTIVITY_TYPES = [
  "note",
  "call",
  "email",
  "whatsapp",
  "viewing",
  "status_change",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

/**
 * Hex colors for pipeline stages — used for badges, kanban columns, and charts.
 * The six active stages are a single-hue ordinal ramp (validated: monotone
 * lightness, distinct adjacent steps, clears contrast against the dark ivy
 * surface) rather than arbitrary categorical hues — stage order carries the
 * meaning, so one blue getting bolder as a deal progresses reads better than
 * six unrelated colors. The three terminal/paused statuses get fixed,
 * validated-distinct colors instead (gold win / red loss / grey hold).
 */
export const STATUS_COLORS: Record<LeadStatus, string> = {
  "New Lead": "#BED2EC",
  Contacted: "#9FBDE3",
  Qualified: "#81A9DA",
  "Viewing Scheduled": "#6294D1",
  Negotiating: "#447FC8",
  "Offer Made": "#256ABF",
  "Closed - Won": "#C9A24B",
  "Closed - Lost": "#CD5C5C",
  "On Hold": "#909A93",
};

/** Hex colors for lead priority — used for badges and charts. */
export const PRIORITY_COLORS: Record<LeadPriority, string> = {
  Hot: "#E4572E",
  Warm: "#F2C14E",
  Cold: "#4A90C2",
};
