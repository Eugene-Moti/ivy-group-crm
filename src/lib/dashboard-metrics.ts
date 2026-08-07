import {
  startOfWeek,
  subWeeks,
  isAfter,
  isBefore,
  format,
  subDays,
  startOfDay,
  endOfDay,
} from "date-fns";
import { LEAD_STATUSES, LEAD_PRIORITIES, type LeadStatus, type LeadPriority } from "@/lib/constants";

export type DashboardLead = {
  id: string;
  status: LeadStatus;
  priority: LeadPriority;
  budget_min: number | null;
  budget_max: number | null;
  created_at: string;
  next_follow_up_at: string | null;
  lead_source_id: string | null;
  lead_source_name: string | null;
  assigned_to: string | null;
  assigned_agent_name: string | null;
};

const CLOSED: LeadStatus[] = ["Closed - Won", "Closed - Lost"];

export function computeKpis(leads: DashboardLead[], now: Date) {
  const totalLeads = leads.length;

  const weekAgo = subWeeks(now, 1);
  const newThisWeek = leads.filter((l) => isAfter(new Date(l.created_at), weekAgo)).length;

  const overdueFollowUps = leads.filter(
    (l) =>
      l.next_follow_up_at &&
      isBefore(new Date(l.next_follow_up_at), now) &&
      !CLOSED.includes(l.status)
  ).length;

  const dealsWon = leads.filter((l) => l.status === "Closed - Won").length;
  const conversionRate = totalLeads > 0 ? (dealsWon / totalLeads) * 100 : 0;

  const pipelineValue = leads
    .filter((l) => !CLOSED.includes(l.status))
    .reduce((sum, l) => sum + (l.budget_max ?? l.budget_min ?? 0), 0);

  return {
    totalLeads,
    newThisWeek,
    overdueFollowUps,
    dealsWon,
    conversionRate,
    pipelineValue,
  };
}

export function computePipelineByStatus(leads: DashboardLead[]) {
  return LEAD_STATUSES.map((status) => ({
    status,
    count: leads.filter((l) => l.status === status).length,
  }));
}

export function computePrioritySplit(leads: DashboardLead[]) {
  return LEAD_PRIORITIES.map((priority) => ({
    priority,
    count: leads.filter((l) => l.priority === priority).length,
  }));
}

const OTHER_SOURCE_CAP = 6;

export function computeLeadsBySource(leads: DashboardLead[]) {
  const counts = new Map<string, number>();
  for (const lead of leads) {
    const name = lead.lead_source_name ?? "Unknown";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  const sorted = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  if (sorted.length <= OTHER_SOURCE_CAP) return sorted;

  const top = sorted.slice(0, OTHER_SOURCE_CAP - 1);
  const rest = sorted.slice(OTHER_SOURCE_CAP - 1);
  const otherCount = rest.reduce((sum, r) => sum + r.count, 0);
  return [...top, { name: "Other", count: otherCount }];
}

export function computeLeadsOverTime(leads: DashboardLead[], now: Date) {
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(now, 11 - i), { weekStartsOn: 1 });
    return { weekStart, label: format(weekStart, "d MMM"), count: 0 };
  });

  for (const lead of leads) {
    const createdAt = new Date(lead.created_at);
    for (let i = weeks.length - 1; i >= 0; i--) {
      if (!isBefore(createdAt, weeks[i].weekStart)) {
        weeks[i].count += 1;
        break;
      }
    }
  }

  return weeks.map((w) => ({ label: w.label, count: w.count }));
}

const AGENT_LEADERBOARD_CAP = 8;

export function computeAgentLeaderboard(leads: DashboardLead[]) {
  const counts = new Map<string, { name: string; count: number }>();
  for (const lead of leads) {
    if (!lead.assigned_to) continue;
    const entry = counts.get(lead.assigned_to) ?? {
      name: lead.assigned_agent_name ?? "Unknown",
      count: 0,
    };
    entry.count += 1;
    counts.set(lead.assigned_to, entry);
  }
  return [...counts.entries()]
    .map(([id, { name, count }]) => ({ id, name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, AGENT_LEADERBOARD_CAP);
}

export type KpiTrends = {
  totalLeads: number[];
  newThisWeek: number[];
  overdueFollowUps: number[];
  dealsWon: number[];
  conversionRate: number[];
  pipelineValue: number[];
};

/**
 * 7-day sparkline data for each KPI card. We don't have historical
 * snapshots (no audit table), so — except for "New this week", which is
 * exact — every trend is a cohort view: "of leads created on/before day X,
 * how many currently satisfy this KPI's condition". That's a real,
 * unfabricated slice of current data, just not a precise "when did this
 * happen" timeline.
 */
export function computeKpiTrends(leads: DashboardLead[], now: Date): KpiTrends {
  const dayBoundaries = Array.from({ length: 7 }, (_, i) => endOfDay(subDays(now, 6 - i)));

  const totalLeads: number[] = [];
  const overdueFollowUps: number[] = [];
  const dealsWon: number[] = [];
  const conversionRate: number[] = [];
  const pipelineValue: number[] = [];

  for (const boundary of dayBoundaries) {
    const cohort = leads.filter((l) => !isAfter(new Date(l.created_at), boundary));
    const kpis = computeKpis(cohort, now);
    totalLeads.push(kpis.totalLeads);
    overdueFollowUps.push(kpis.overdueFollowUps);
    dealsWon.push(kpis.dealsWon);
    conversionRate.push(kpis.conversionRate);
    pipelineValue.push(kpis.pipelineValue);
  }

  const newThisWeek = Array.from({ length: 7 }, (_, i) => {
    const dayStart = startOfDay(subDays(now, 6 - i));
    const dayEnd = endOfDay(subDays(now, 6 - i));
    return leads.filter((l) => {
      const createdAt = new Date(l.created_at);
      return !isBefore(createdAt, dayStart) && !isAfter(createdAt, dayEnd);
    }).length;
  });

  return { totalLeads, newThisWeek, overdueFollowUps, dealsWon, conversionRate, pipelineValue };
}
