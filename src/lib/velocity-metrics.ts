import { differenceInCalendarDays } from "date-fns";
import { CLOSED_STATUSES } from "@/lib/leads";
import type { LeadStatus } from "@/lib/constants";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { ActivitySummary } from "@/lib/full-analysis";

export type VelocityGroupRow = { name: string; avgDays: number; medianDays: number; count: number };

export type VelocityAnalysis = {
  byStatus: VelocityGroupRow[];
  byManager: VelocityGroupRow[];
  byProject: VelocityGroupRow[];
  closeTime: {
    won: { avgDays: number; medianDays: number; coveredCount: number; totalCount: number };
    lost: { avgDays: number; medianDays: number; coveredCount: number; totalCount: number };
  };
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function summarize(name: string, days: number[]): VelocityGroupRow {
  return { name, avgDays: days.length ? days.reduce((s, d) => s + d, 0) / days.length : 0, medianDays: median(days), count: days.length };
}

function groupBy<T>(items: T[], keyOf: (item: T) => number, labelOf: (item: T) => string): VelocityGroupRow[] {
  const map = new Map<string, number[]>();
  for (const item of items) {
    const label = labelOf(item);
    const arr = map.get(label) ?? [];
    arr.push(keyOf(item));
    map.set(label, arr);
  }
  return [...map.entries()]
    .map(([name, days]) => summarize(name, days))
    .sort((a, b) => b.avgDays - a.avgDays);
}

/**
 * Time-in-stage / sales-velocity metrics, built from status_change activities.
 * These are only logged when a lead's status changes via the Kanban board or
 * the edit form (both log it as of this feature) — a lead that has never had
 * its status changed since being created has no status_change record, so its
 * "entered current stage" time falls back to its inquiry date. That's exact
 * for leads that genuinely haven't moved; for older leads whose status
 * changed before this logging existed, it will overstate how long they've
 * been in their current stage.
 */
export function computeVelocity(
  leads: LeadWithRelations[],
  statusChangeSummaries: ActivitySummary[],
  now: Date = new Date()
): VelocityAnalysis {
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

  function enteredCurrentStageAt(lead: LeadWithRelations): Date {
    const changes = changesByLead.get(lead.id);
    if (changes && changes.length > 0) return new Date(changes[changes.length - 1].created_at);
    return new Date(lead.created_at);
  }

  const openLeads = leads.filter((l) => !CLOSED_STATUSES.includes(l.status));
  const openWithAge = openLeads.map((lead) => ({
    lead,
    days: differenceInCalendarDays(now, enteredCurrentStageAt(lead)),
  }));

  const byStatus = groupBy(
    openWithAge,
    (r) => r.days,
    (r) => r.lead.status as LeadStatus
  );
  const byManager = groupBy(
    openWithAge,
    (r) => r.days,
    (r) => r.lead.assigned_agent?.name ?? "Unassigned"
  );
  const byProject = groupBy(
    openWithAge,
    (r) => r.days,
    (r) => r.lead.property_type?.name ?? "Unassigned"
  );

  function closeTimeFor(status: LeadStatus) {
    const closed = leads.filter((l) => l.status === status);
    const withHistory = closed.filter((l) => (changesByLead.get(l.id)?.length ?? 0) > 0);
    const days = withHistory.map((l) =>
      differenceInCalendarDays(enteredCurrentStageAt(l), new Date(l.created_at))
    );
    return {
      avgDays: days.length ? days.reduce((s, d) => s + d, 0) / days.length : 0,
      medianDays: median(days),
      coveredCount: withHistory.length,
      totalCount: closed.length,
    };
  }

  return {
    byStatus,
    byManager,
    byProject,
    closeTime: {
      won: closeTimeFor("Closed - Won"),
      lost: closeTimeFor("Closed - Lost"),
    },
  };
}
