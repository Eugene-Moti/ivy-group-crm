import { subWeeks, isAfter, isBefore, subDays, startOfDay, endOfDay, startOfMonth, subMonths, format } from "date-fns";
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

export type SalesMonth = { key: string; label: string; value: number; units: number };

/**
 * Twelve calendar months of closed sales (sum of unit_amount from
 * units_sold, by sold_at), oldest first, ending with the current month.
 * Sale amounts only — bonus figures are deliberately never surfaced on
 * the dashboard.
 */
export function computeSalesByMonth(
  units: { unit_amount: number; sold_at: string }[],
  now: Date
): { months: SalesMonth[]; thisMonth: SalesMonth; lastMonth: SalesMonth } {
  const months: SalesMonth[] = Array.from({ length: 12 }, (_, i) => {
    const start = startOfMonth(subMonths(now, 11 - i));
    return { key: format(start, "yyyy-MM"), label: format(start, "MMM yyyy"), value: 0, units: 0 };
  });
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const u of units) {
    const m = byKey.get(format(new Date(u.sold_at), "yyyy-MM"));
    if (!m) continue;
    m.value += Number(u.unit_amount) || 0;
    m.units += 1;
  }
  return { months, thisMonth: months[11], lastMonth: months[10] };
}

/* ------------------------------------------------------------------ *
 * The "new face" tiles (brand board layout). Everything is computed   *
 * per calendar month so each tile can say "vs <last month>".          *
 * ------------------------------------------------------------------ */

export type MonthSeries = { labels: string[]; values: number[]; current: number; previous: number };

function lastTwelveMonthKeys(now: Date) {
  return Array.from({ length: 12 }, (_, i) => {
    const start = startOfMonth(subMonths(now, 11 - i));
    return { key: format(start, "yyyy-MM"), label: format(start, "MMM yyyy") };
  });
}

/** Count dates per calendar month for the last 12 months, oldest first. */
export function countByMonth(dates: string[], now: Date): MonthSeries {
  const months = lastTwelveMonthKeys(now);
  const index = new Map(months.map((m, i) => [m.key, i]));
  const values = months.map(() => 0);
  for (const d of dates) {
    const i = index.get(format(new Date(d), "yyyy-MM"));
    if (i !== undefined) values[i] += 1;
  }
  return { labels: months.map((m) => m.label), values, current: values[11], previous: values[10] };
}

/**
 * Lead-to-sale rate at the end of each month: of the leads that existed by
 * then, the share that is Won today. A cohort view (there are no historical
 * status snapshots), so it is labelled "% of leads won", not a monthly rate.
 */
export function conversionByMonth(leads: DashboardLead[], now: Date): MonthSeries {
  const months = lastTwelveMonthKeys(now);
  const values = months.map((m, i) => {
    const boundary = i === 11 ? now : endOfDay(subDays(startOfMonth(subMonths(now, 10 - i)), 1));
    const cohort = leads.filter((l) => !isAfter(new Date(l.created_at), boundary));
    if (cohort.length === 0) return 0;
    return (cohort.filter((l) => l.status === WON_STATUS_KEY).length / cohort.length) * 100;
  });
  return { labels: months.map((m) => m.label), values, current: values[11], previous: values[10] };
}

export type ProjectUnits = { id: string; name: string; units: { number: string; amount: number; soldAt: string }[]; value: number };

/** Units sold, grouped by the buyer's project (property type). Sale amounts only, never bonuses. */
export function unitsByProject(
  units: { lead_id: string; unit_number: string; unit_amount: number; sold_at: string }[],
  projectOfLead: Map<string, { id: string; name: string } | null>
): ProjectUnits[] {
  const byProject = new Map<string, ProjectUnits>();
  for (const u of units) {
    const p = projectOfLead.get(u.lead_id) ?? null;
    const id = p?.id ?? "none";
    const entry = byProject.get(id) ?? { id, name: p?.name ?? "No project set", units: [], value: 0 };
    entry.units.push({ number: u.unit_number, amount: Number(u.unit_amount) || 0, soldAt: u.sold_at });
    entry.value += Number(u.unit_amount) || 0;
    byProject.set(id, entry);
  }
  return [...byProject.values()].sort((a, b) => b.units.length - a.units.length || a.name.localeCompare(b.name));
}

export type ManagerRow = { id: string; name: string; won: number; value: number; share: number };

/**
 * Sales managers ranked by the value of unit sales they closed in a month
 * (the manager is the agent the buyer's lead is assigned to). Falls back to
 * last month when nothing has sold yet this month, and says which it used.
 */
export function topManagers(
  units: { lead_id: string; unit_amount: number; sold_at: string }[],
  managerOfLead: Map<string, { id: string; name: string } | null>,
  now: Date
): { monthLabel: string; rows: ManagerRow[] } {
  const pick = (monthStart: Date) => {
    const key = format(monthStart, "yyyy-MM");
    const totals = new Map<string, ManagerRow>();
    for (const u of units) {
      if (format(new Date(u.sold_at), "yyyy-MM") !== key) continue;
      const m = managerOfLead.get(u.lead_id);
      if (!m) continue;
      const row = totals.get(m.id) ?? { id: m.id, name: m.name, won: 0, value: 0, share: 0 };
      row.won += 1;
      row.value += Number(u.unit_amount) || 0;
      totals.set(m.id, row);
    }
    const rows = [...totals.values()].sort((a, b) => b.value - a.value || b.won - a.won);
    const total = rows.reduce((s, r) => s + r.value, 0);
    for (const r of rows) r.share = total > 0 ? r.value / total : 0;
    return { monthLabel: format(monthStart, "MMMM"), rows: rows.slice(0, 6) };
  };
  const thisMonth = pick(startOfMonth(now));
  if (thisMonth.rows.length > 0) return thisMonth;
  const lastMonth = pick(startOfMonth(subMonths(now, 1)));
  return lastMonth.rows.length > 0 ? lastMonth : thisMonth;
}
