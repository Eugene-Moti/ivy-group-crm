import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek, subMonths, subWeeks } from "date-fns";
import { LOST_STATUS_KEY, WON_STATUS_KEY } from "@/lib/constants";
import { fullName } from "@/lib/format";
import type { ActivitySummary, InsightLeadRef, RatePerformance } from "@/lib/full-analysis";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { UnitSoldRow } from "@/lib/queries/units-sold";

export type PeriodType = "week" | "month";

export type PeriodOption = {
  key: string;
  label: string;
  start: Date;
  end: Date;
};

const PERIOD_OPTION_COUNT = 12;
const WEEK_OPTS = { weekStartsOn: 1 as const };

function buildPeriod(type: PeriodType, start: Date, isCurrent: boolean): PeriodOption {
  const end = type === "week" ? endOfWeek(start, WEEK_OPTS) : endOfMonth(start);
  const label =
    type === "week"
      ? `${format(start, "d MMM")} – ${format(end, "d MMM yyyy")}`
      : format(start, "MMMM yyyy");
  return { key: start.toISOString(), label: isCurrent ? `${label} (current)` : label, start, end };
}

/** The current period plus the trailing 11, newest first — what the picker offers. */
export function generatePeriodOptions(type: PeriodType, now: Date = new Date()): PeriodOption[] {
  return Array.from({ length: PERIOD_OPTION_COUNT }, (_, i) => {
    const start =
      type === "week" ? startOfWeek(subWeeks(now, i), WEEK_OPTS) : startOfMonth(subMonths(now, i));
    return buildPeriod(type, start, i === 0);
  });
}

/** The period immediately before the given one — the baseline every comparison in this report is measured against. */
export function getPreviousPeriod(type: PeriodType, period: PeriodOption): PeriodOption {
  const start = type === "week" ? subWeeks(period.start, 1) : subMonths(period.start, 1);
  return buildPeriod(type, start, false);
}

export type PeriodInsight = {
  severity: "critical" | "warning" | "positive" | "info";
  title: string;
  detail: string;
  leads?: InsightLeadRef[];
};

export type PeriodMetrics = {
  newLeads: number;
  won: number;
  lost: number;
  /** Won / (Won + Lost) among leads closed *during this period* — not an all-time rate. */
  conversionRate: number;
  unitsSoldCount: number;
  unitsSoldValue: number;
  bonusEarned: number;
  siteVisits: number;
  activityCount: number;
  lostByReason: { reason: string; count: number }[];
  bySource: RatePerformance[];
  byManager: RatePerformance[];
  byProject: RatePerformance[];
};

export type PeriodReportResult = {
  type: PeriodType;
  period: PeriodOption;
  previousPeriod: PeriodOption;
  current: PeriodMetrics;
  previous: PeriodMetrics;
  insights: PeriodInsight[];
};

function inRange(dateStr: string, start: Date, end: Date): boolean {
  const t = new Date(dateStr).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function rate(total: number, won: number): number {
  return total > 0 ? (won / total) * 100 : 0;
}

function groupPerformance(
  closed: LeadWithRelations[],
  keyFn: (l: LeadWithRelations) => string
): RatePerformance[] {
  const map = new Map<string, { total: number; won: number }>();
  for (const l of closed) {
    const key = keyFn(l);
    const entry = map.get(key) ?? { total: 0, won: 0 };
    entry.total += 1;
    if (l.status === WON_STATUS_KEY) entry.won += 1;
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, total: v.total, won: v.won, winRate: rate(v.total, v.won) }))
    .sort((a, b) => b.total - a.total);
}

type MetricsWithLeads = PeriodMetrics & {
  wonLeads: LeadWithRelations[];
  lostLeads: LeadWithRelations[];
  closedLeads: LeadWithRelations[];
};

function computeMetrics(
  leads: LeadWithRelations[],
  activitySummaries: ActivitySummary[],
  unitsSold: UnitSoldRow[],
  period: PeriodOption
): MetricsWithLeads {
  // Real Estate Agent leads are a referral channel, not client deals —
  // excluded here for the same reason every other deal-performance report
  // excludes them.
  const clientLeads = leads.filter((l) => l.lead_type !== "Real Estate Agent");

  const newLeads = clientLeads.filter((l) => inRange(l.created_at, period.start, period.end));
  const wonLeads = clientLeads.filter(
    (l) => l.status === WON_STATUS_KEY && inRange(l.updated_at, period.start, period.end)
  );
  const lostLeads = clientLeads.filter(
    (l) => l.status === LOST_STATUS_KEY && inRange(l.updated_at, period.start, period.end)
  );
  const closedLeads = [...wonLeads, ...lostLeads];

  const periodUnits = unitsSold.filter((u) => inRange(u.sold_at, period.start, period.end));
  const periodActivities = activitySummaries.filter((a) =>
    inRange(a.created_at, period.start, period.end)
  );

  const lostReasonCounts = new Map<string, number>();
  for (const l of lostLeads) {
    const reason = l.lost_reason ?? "Not specified";
    lostReasonCounts.set(reason, (lostReasonCounts.get(reason) ?? 0) + 1);
  }

  return {
    newLeads: newLeads.length,
    won: wonLeads.length,
    lost: lostLeads.length,
    conversionRate: rate(closedLeads.length, wonLeads.length),
    unitsSoldCount: periodUnits.length,
    unitsSoldValue: periodUnits.reduce((s, u) => s + u.unit_amount, 0),
    bonusEarned: periodUnits.reduce((s, u) => s + u.bonus_amount, 0),
    siteVisits: periodActivities.filter((a) => a.type === "viewing").length,
    activityCount: periodActivities.length,
    lostByReason: Array.from(lostReasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    bySource: groupPerformance(closedLeads, (l) => l.lead_source?.name ?? "Unknown"),
    byManager: groupPerformance(closedLeads, (l) => l.assigned_agent?.name ?? "Unassigned"),
    byProject: groupPerformance(closedLeads, (l) => l.property_type?.name ?? "Unassigned"),
    wonLeads,
    lostLeads,
    closedLeads,
  };
}

const MIN_VOLUME_FOR_COMPARISON = 2;
const NOTABLE_CHANGE_PCT = 20;
const NOTABLE_CONVERSION_POINTS = 10;

function pctChange(curr: number, prev: number): number | null {
  if (prev === 0) return null; // no baseline to compare against
  return ((curr - prev) / prev) * 100;
}

function computeInsights(
  current: MetricsWithLeads,
  previous: MetricsWithLeads,
  type: PeriodType
): PeriodInsight[] {
  const insights: PeriodInsight[] = [];
  const periodWord = type === "week" ? "week" : "month";
  const refs = (list: LeadWithRelations[]): InsightLeadRef[] =>
    list.map((l) => ({ id: l.id, name: fullName(l) }));

  const leadsChange = pctChange(current.newLeads, previous.newLeads);
  if (leadsChange !== null && Math.abs(leadsChange) >= NOTABLE_CHANGE_PCT) {
    const down = leadsChange < 0;
    insights.push({
      severity: down ? "warning" : "positive",
      title: `New leads ${down ? "down" : "up"} ${Math.abs(leadsChange).toFixed(0)}% vs the previous ${periodWord}`,
      detail: `${current.newLeads} new lead${current.newLeads === 1 ? "" : "s"} this ${periodWord}, vs ${previous.newLeads} before.`,
    });
  }

  const enoughVolume =
    current.won + current.lost >= MIN_VOLUME_FOR_COMPARISON &&
    previous.won + previous.lost >= MIN_VOLUME_FOR_COMPARISON;
  if (enoughVolume) {
    const delta = current.conversionRate - previous.conversionRate;
    if (Math.abs(delta) >= NOTABLE_CONVERSION_POINTS) {
      const down = delta < 0;
      insights.push({
        severity: down ? "critical" : "positive",
        title: `Conversion rate ${down ? "down" : "up"} ${Math.abs(delta).toFixed(1)} points vs the previous ${periodWord}`,
        detail: `${current.conversionRate.toFixed(1)}% this ${periodWord}, vs ${previous.conversionRate.toFixed(1)}% before.`,
      });
    }
  }

  if (current.lostByReason.length > 0 && current.lostByReason[0].count >= MIN_VOLUME_FOR_COMPARISON) {
    const top = current.lostByReason[0];
    insights.push({
      severity: "warning",
      title: `"${top.reason}" was the most common reason deals were lost this ${periodWord}`,
      detail: `${top.count} of ${current.lost} lost deal${current.lost === 1 ? "" : "s"} this ${periodWord} — worth a closer look if it keeps coming up.`,
      leads: refs(current.lostLeads.filter((l) => (l.lost_reason ?? "Not specified") === top.reason)),
    });
  }

  const ratedManagers = current.byManager.filter((m) => m.total >= MIN_VOLUME_FOR_COMPARISON);
  if (ratedManagers.length >= 2) {
    const sorted = [...ratedManagers].sort((a, b) => a.winRate - b.winRate);
    const weakest = sorted[0];
    const strongest = sorted[sorted.length - 1];
    if (weakest.winRate < strongest.winRate) {
      insights.push({
        severity: "warning",
        title: `${weakest.name} had the lowest win rate this ${periodWord} (${weakest.winRate.toFixed(0)}%)`,
        detail: `${weakest.won} of ${weakest.total} closed deal${weakest.total === 1 ? "" : "s"} won — worth a check-in on what's getting in the way.`,
        leads: refs(
          current.closedLeads.filter((l) => (l.assigned_agent?.name ?? "Unassigned") === weakest.name)
        ),
      });
      insights.push({
        severity: "positive",
        title: `${strongest.name} led the team this ${periodWord} (${strongest.winRate.toFixed(0)}% win rate)`,
        detail: `${strongest.won} of ${strongest.total} closed deal${strongest.total === 1 ? "" : "s"} won.`,
        leads: refs(
          current.closedLeads.filter((l) => (l.assigned_agent?.name ?? "Unassigned") === strongest.name)
        ),
      });
    }
  }

  const deadSources = current.bySource.filter((s) => s.total >= MIN_VOLUME_FOR_COMPARISON && s.won === 0);
  for (const s of deadSources) {
    insights.push({
      severity: "warning",
      title: `${s.name} produced no wins this ${periodWord} despite ${s.total} closed lead${s.total === 1 ? "" : "s"}`,
      detail: "Worth reviewing lead quality from this source, or whether it needs a different follow-up approach.",
      leads: refs(current.closedLeads.filter((l) => (l.lead_source?.name ?? "Unknown") === s.name)),
    });
  }

  if (current.unitsSoldCount > 0) {
    insights.push({
      severity: "info",
      title: `${current.unitsSoldCount} unit${current.unitsSoldCount === 1 ? "" : "s"} sold this ${periodWord}`,
      detail: `Earning the marketing team a combined bonus of KES ${Math.round(current.bonusEarned).toLocaleString("en-US")}.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      severity: "info",
      title: `Nothing stands out vs the previous ${periodWord}`,
      detail: "Performance held roughly steady — no notable swings in either direction.",
    });
  }

  return insights;
}

function stripLeads(m: MetricsWithLeads): PeriodMetrics {
  const { wonLeads: _w, lostLeads: _l, closedLeads: _c, ...metrics } = m;
  void _w;
  void _l;
  void _c;
  return metrics;
}

export function computePeriodReport(
  leads: LeadWithRelations[],
  activitySummaries: ActivitySummary[],
  unitsSold: UnitSoldRow[],
  type: PeriodType,
  period: PeriodOption
): PeriodReportResult {
  const previousPeriod = getPreviousPeriod(type, period);
  const current = computeMetrics(leads, activitySummaries, unitsSold, period);
  const previous = computeMetrics(leads, activitySummaries, unitsSold, previousPeriod);

  return {
    type,
    period,
    previousPeriod,
    current: stripLeads(current),
    previous: stripLeads(previous),
    insights: computeInsights(current, previous, type),
  };
}
