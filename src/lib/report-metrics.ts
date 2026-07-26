import { LEAD_STATUSES } from "@/lib/constants";
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
