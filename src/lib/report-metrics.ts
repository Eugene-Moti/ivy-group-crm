import { LEAD_STATUSES } from "@/lib/constants";
import { CLOSED_STATUSES, getFollowUpAlert } from "@/lib/leads";
import type { LeadWithRelations } from "@/lib/queries/leads";

export type ReportFilters = {
  status: string;
  source: string;
  priority: string;
  agent: string;
  propertyTypeId: string;
  area: string;
  budgetMin: string;
  budgetMax: string;
  dateFrom: string;
  dateTo: string;
};

export const ALL = "all";

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  status: ALL,
  source: ALL,
  priority: ALL,
  agent: ALL,
  propertyTypeId: ALL,
  area: ALL,
  budgetMin: "",
  budgetMax: "",
  dateFrom: "",
  dateTo: "",
};

export function applyReportFilters(
  leads: LeadWithRelations[],
  filters: ReportFilters
): LeadWithRelations[] {
  const min = filters.budgetMin ? Number(filters.budgetMin) : undefined;
  const max = filters.budgetMax ? Number(filters.budgetMax) : undefined;
  const from = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
  const to = filters.dateTo ? new Date(filters.dateTo) : undefined;

  return leads.filter((lead) => {
    if (filters.status !== ALL && lead.status !== filters.status) return false;
    if (filters.priority !== ALL && lead.priority !== filters.priority) return false;
    if (filters.source !== ALL && lead.lead_source_id !== filters.source) return false;
    if (filters.agent !== ALL && lead.assigned_to !== filters.agent) return false;
    if (filters.propertyTypeId !== ALL && lead.property_type_id !== filters.propertyTypeId)
      return false;
    if (filters.area !== ALL && lead.preferred_area !== filters.area) return false;
    if (min != null && (lead.budget_max ?? lead.budget_min ?? 0) < min) return false;
    if (max != null && (lead.budget_min ?? lead.budget_max ?? 0) > max) return false;
    const createdAt = new Date(lead.created_at);
    if (from && createdAt < from) return false;
    if (to && createdAt > to) return false;
    return true;
  });
}

export function computeSourcePerformance(leads: LeadWithRelations[]) {
  const map = new Map<string, { total: number; won: number }>();
  for (const lead of leads) {
    const name = lead.lead_source?.name ?? "Unknown";
    const entry = map.get(name) ?? { total: 0, won: 0 };
    entry.total += 1;
    if (lead.status === "Closed - Won") entry.won += 1;
    map.set(name, entry);
  }
  return [...map.entries()]
    .map(([source, { total, won }]) => ({
      source,
      total,
      won,
      winRate: total > 0 ? (won / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export function computeConversionByStage(leads: LeadWithRelations[]) {
  const total = leads.length;
  return LEAD_STATUSES.map((status) => {
    const count = leads.filter((l) => l.status === status).length;
    return {
      status,
      count,
      percentOfTotal: total > 0 ? (count / total) * 100 : 0,
    };
  });
}

export type FollowUpBucket = "Overdue" | "Due Soon" | "On Track" | "Not scheduled";
const FOLLOW_UP_BUCKETS: FollowUpBucket[] = ["Overdue", "Due Soon", "On Track", "Not scheduled"];

/**
 * Follow-up load across open leads only — closed deals don't need a next
 * step, so they're excluded from both the totals and the per-agent
 * breakdown rather than padding out a "Not scheduled" bucket that isn't
 * actionable.
 */
export function computeFollowUpSummary(leads: LeadWithRelations[]) {
  const open = leads.filter((l) => !CLOSED_STATUSES.includes(l.status));

  const emptyCounts = (): Record<FollowUpBucket, number> => ({
    Overdue: 0,
    "Due Soon": 0,
    "On Track": 0,
    "Not scheduled": 0,
  });

  const totals = emptyCounts();
  const byAgent = new Map<string, Record<FollowUpBucket, number>>();

  for (const lead of open) {
    const alert = getFollowUpAlert(lead.next_follow_up_at, lead.status);
    const bucket: FollowUpBucket = alert === "None" ? "Not scheduled" : alert;
    totals[bucket] += 1;

    const agentName = lead.assigned_agent?.name ?? "Unassigned";
    const entry = byAgent.get(agentName) ?? emptyCounts();
    entry[bucket] += 1;
    byAgent.set(agentName, entry);
  }

  const rows = [...byAgent.entries()]
    .map(([agent, counts]) => ({
      agent,
      ...counts,
      total: FOLLOW_UP_BUCKETS.reduce((sum, b) => sum + counts[b], 0),
    }))
    .sort((a, b) => b.Overdue - a.Overdue || b.total - a.total);

  return { totals, openCount: open.length, rows };
}

export function computeAgentPerformance(leads: LeadWithRelations[]) {
  const map = new Map<string, { total: number; won: number }>();
  for (const lead of leads) {
    const name = lead.assigned_agent?.name ?? "Unassigned";
    const entry = map.get(name) ?? { total: 0, won: 0 };
    entry.total += 1;
    if (lead.status === "Closed - Won") entry.won += 1;
    map.set(name, entry);
  }
  return [...map.entries()]
    .map(([agent, { total, won }]) => ({
      agent,
      total,
      won,
      winRate: total > 0 ? (won / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);
}
