import type { LeadStatus } from "@/lib/constants";
import { formatBudgetRange, fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

export type FollowUpAlert = "Overdue" | "Due Soon" | "On Track" | "None";

export const CLOSED_STATUSES: LeadStatus[] = ["Closed - Won", "Closed - Lost"];

const DUE_SOON_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Overdue: past due. Due Soon: within the next 3 days. On Track: further out.
 * None: no follow-up scheduled, or the deal is already closed.
 */
export function getFollowUpAlert(
  nextFollowUpAt: string | null,
  status: LeadStatus
): FollowUpAlert {
  if (!nextFollowUpAt || CLOSED_STATUSES.includes(status)) return "None";

  const dueAt = new Date(nextFollowUpAt).getTime();
  const now = Date.now();

  if (dueAt < now) return "Overdue";
  if (dueAt - now <= DUE_SOON_WINDOW_MS) return "Due Soon";
  return "On Track";
}

export const FOLLOW_UP_ALERT_COLORS: Record<FollowUpAlert, string> = {
  Overdue: "#E4572E",
  "Due Soon": "#F2C14E",
  "On Track": "#4FAE8A",
  None: "#7A8B84",
};

/** Plain-text client summary for relaying a lead to its assigned sales manager. */
export function buildClientDetailsMessage(lead: LeadWithRelations): string {
  const lines = [
    `New client lead: ${fullName(lead)}`,
    lead.phone && `Phone: ${lead.phone}`,
    lead.email && `Email: ${lead.email}`,
    lead.preferred_area && `Area: ${lead.preferred_area}`,
    lead.property_type?.name && `Property type: ${lead.property_type.name}`,
    (lead.budget_min != null || lead.budget_max != null) &&
      `Budget: ${formatBudgetRange(lead.budget_min, lead.budget_max)}`,
    lead.bedrooms != null && `Beds: ${lead.bedrooms}`,
    `Priority: ${lead.priority}`,
    `Status: ${lead.status}`,
    lead.notes && `Notes: ${lead.notes}`,
  ].filter((line): line is string => Boolean(line));

  return [...lines, "", "— Sent from the Ivy Group CRM"].join("\n");
}

/** Plain-text summary of multiple leads for relaying a batch to one sales manager. */
export function buildBulkClientDetailsMessage(leads: LeadWithRelations[]): string {
  const entries = leads.map((lead, i) => {
    const lines = [
      `${i + 1}. ${fullName(lead)}`,
      lead.phone && `   Phone: ${lead.phone}`,
      lead.email && `   Email: ${lead.email}`,
      lead.preferred_area && `   Area: ${lead.preferred_area}`,
      (lead.budget_min != null || lead.budget_max != null) &&
        `   Budget: ${formatBudgetRange(lead.budget_min, lead.budget_max)}`,
      `   Priority: ${lead.priority}`,
    ].filter((line): line is string => Boolean(line));
    return lines.join("\n");
  });

  return [
    `${leads.length} client leads:`,
    "",
    ...entries,
    "",
    "— Sent from the Ivy Group CRM",
  ].join("\n");
}
