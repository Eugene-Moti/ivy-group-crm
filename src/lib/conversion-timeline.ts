import { differenceInCalendarDays } from "date-fns";
import { formatDate } from "@/lib/format";
import { WON_STATUS_KEY, LOST_STATUS_KEY } from "@/lib/constants";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { ActivitySummary } from "@/lib/full-analysis";

export type ConversionTimelineRow = {
  id: string;
  name: string;
  managerName: string;
  projectName: string;
  outcome: "Won" | "Lost";
  inquiryDate: string;
  closedDate: string | null;
  daysToClose: number | null;
  statusPath: string;
  hasHistory: boolean;
};

const TRANSITION_RE = /^Status changed from (.+) to (.+)\.$/;

function parseTransition(body: string | null): { from: string; to: string } | null {
  if (!body) return null;
  const m = TRANSITION_RE.exec(body);
  if (!m) return null;
  return { from: m[1], to: m[2] };
}

/**
 * A per-lead conversion record: how long each closed deal took, and the
 * sequence of pipeline stages it passed through, reconstructed from logged
 * status_change activities. A lead whose status was never changed via the
 * Kanban board or edit form (or was set directly on import) has no such
 * activity — its path/duration is shown as unknown rather than guessed.
 */
export function computeConversionTimelines(
  leads: LeadWithRelations[],
  statusChangeSummaries: ActivitySummary[]
): ConversionTimelineRow[] {
  const changesByLead = new Map<string, ActivitySummary[]>();
  for (const s of statusChangeSummaries) {
    if (s.type !== "status_change") continue;
    const arr = changesByLead.get(s.lead_id) ?? [];
    arr.push(s);
    changesByLead.set(s.lead_id, arr);
  }
  for (const arr of changesByLead.values()) {
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  const closedLeads = leads.filter(
    (l) => l.status === WON_STATUS_KEY || l.status === LOST_STATUS_KEY
  );

  return closedLeads
    .map((lead): ConversionTimelineRow => {
      const changes = changesByLead.get(lead.id) ?? [];
      const transitions = changes
        .map((c) => parseTransition(c.body ?? null))
        .filter((t): t is { from: string; to: string } => !!t);

      const hasHistory = transitions.length > 0;
      const path = hasHistory
        ? [transitions[0].from, ...transitions.map((t) => t.to)]
        : [];
      const lastChange = hasHistory ? changes[changes.length - 1] : null;

      return {
        id: lead.id,
        name: `${lead.first_name} ${lead.last_name}`.trim(),
        managerName: lead.assigned_agent?.name ?? "Unassigned",
        projectName: lead.property_type?.name ?? "—",
        outcome: lead.status === WON_STATUS_KEY ? "Won" : "Lost",
        inquiryDate: formatDate(lead.created_at),
        closedDate: lastChange ? formatDate(lastChange.created_at) : null,
        daysToClose: lastChange
          ? differenceInCalendarDays(new Date(lastChange.created_at), new Date(lead.created_at))
          : null,
        statusPath: hasHistory ? path.join(" → ") : "No history recorded",
        hasHistory,
      };
    })
    .sort((a, b) => (b.daysToClose ?? -1) - (a.daysToClose ?? -1));
}
