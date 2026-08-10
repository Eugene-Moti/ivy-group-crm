import { subWeeks, isAfter, isBefore, subDays, startOfDay, endOfDay } from "date-fns";
import {
  CLOSED_STATUS_KEYS,
  LEAD_PRIORITIES,
  WON_STATUS_KEY,
  type LeadStatus,
  type LeadPriority,
} from "@/lib/constants";
import type { PipelineStage } from "@/lib/queries/settings";

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

export function computeKpis(leads: DashboardLead[], now: Date) {
  const totalLeads = leads.length;

  const weekAgo = subWeeks(now, 1);
  const newThisWeek = leads.filter((l) => isAfter(new Date(l.created_at), weekAgo)).length;

  const overdueFollowUps = leads.filter(
    (l) =>
      l.next_follow_up_at &&
      isBefore(new Date(l.next_follow_up_at), now) &&
      !CLOSED_STATUS_KEYS.includes(l.status)
  ).length;

  const dealsWon = leads.filter((l) => l.status === WON_STATUS_KEY).length;
  const conversionRate = totalLeads > 0 ? (dealsWon / totalLeads) * 100 : 0;

  const pipelineValue = leads
    .filter((l) => !CLOSED_STATUS_KEYS.includes(l.status))
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

export function computePipelineByStatus(leads: DashboardLead[], stages: PipelineStage[]) {
  return stages.map((stage) => ({
    status: stage.key,
    count: leads.filter((l) => l.status === stage.key).length,
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
