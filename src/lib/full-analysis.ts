import { differenceInCalendarDays, format } from "date-fns";
import type { ActivityType, LeadStatus } from "@/lib/constants";
import { CLOSED_STATUSES, getFollowUpAlert } from "@/lib/leads";
import type { LeadWithRelations } from "@/lib/queries/leads";

const STALE_OPEN_DAYS = 30;
const HOT_UNCONTACTED_DAYS = 7;
const MIN_VOLUME_FOR_RATE_COMPARISON = 5;

export type ActivitySummary = {
  lead_id: string;
  type: ActivityType;
  created_at: string;
  body: string | null;
};
export type EvidenceLeadId = { lead_id: string };

export type FullAnalysisInsight = {
  severity: "critical" | "warning" | "positive" | "info";
  title: string;
  detail: string;
};

export type RatePerformance = { name: string; total: number; won: number; winRate: number };

export type FullAnalysis = {
  generatedAt: Date;
  overview: {
    totalLeads: number;
    openLeads: number;
    wonLeads: number;
    lostLeads: number;
    conversionRate: number;
    overdueFollowUps: number;
    medianOpenLeadAgeDays: number;
    noteCoverage: number;
    evidenceCoverageOnWon: number;
  };
  byStatus: { status: LeadStatus; label: string; count: number; percentOfTotal: number }[];
  byPriority: { priority: string; count: number; percentOfTotal: number }[];
  byManager: (RatePerformance & { overdue: number })[];
  byProject: RatePerformance[];
  bySource: RatePerformance[];
  byMonth: { label: string; count: number }[];
  insights: FullAnalysisInsight[];
};

function rate(total: number, won: number): number {
  return total > 0 ? (won / total) * 100 : 0;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function computeFullAnalysis(
  leads: LeadWithRelations[],
  activitySummaries: ActivitySummary[],
  evidenceLeadIds: EvidenceLeadId[],
  statusLabels: Record<LeadStatus, string>,
  now: Date = new Date()
): FullAnalysis {
  const totalLeads = leads.length;
  const openLeads = leads.filter((l) => !CLOSED_STATUSES.includes(l.status));
  const wonLeads = leads.filter((l) => l.status === "Closed - Won");
  const lostLeads = leads.filter((l) => l.status === "Closed - Lost");
  const conversionRate = rate(totalLeads, wonLeads.length);

  const overdueFollowUps = openLeads.filter(
    (l) => getFollowUpAlert(l.next_follow_up_at, l.status) === "Overdue"
  ).length;

  const medianOpenLeadAgeDays = median(
    openLeads.map((l) => differenceInCalendarDays(now, new Date(l.created_at)))
  );

  const activityCountByLead = new Map<string, number>();
  for (const a of activitySummaries) {
    activityCountByLead.set(a.lead_id, (activityCountByLead.get(a.lead_id) ?? 0) + 1);
  }
  const lastActivityAtByLead = new Map<string, string>();
  for (const a of activitySummaries) {
    const existing = lastActivityAtByLead.get(a.lead_id);
    if (!existing || new Date(a.created_at) > new Date(existing)) {
      lastActivityAtByLead.set(a.lead_id, a.created_at);
    }
  }
  const evidenceLeadSet = new Set(evidenceLeadIds.map((e) => e.lead_id));

  const noteCoverage = rate(
    totalLeads,
    leads.filter((l) => (activityCountByLead.get(l.id) ?? 0) > 0).length
  );
  const evidenceCoverageOnWon = rate(
    wonLeads.length,
    wonLeads.filter((l) => evidenceLeadSet.has(l.id)).length
  );

  const statusOrder: LeadStatus[] = [
    "New Lead",
    "Contacted",
    "Qualified",
    "Viewing Scheduled",
    "Negotiating",
    "Offer Made",
    "Closed - Won",
    "Closed - Lost",
    "On Hold",
  ];
  const byStatusRows = statusOrder.map((status) => {
    const count = leads.filter((l) => l.status === status).length;
    return {
      status,
      label: statusLabels[status] ?? status,
      count,
      percentOfTotal: totalLeads > 0 ? (count / totalLeads) * 100 : 0,
    };
  });

  const priorityCounts = new Map<string, number>();
  for (const lead of leads) {
    priorityCounts.set(lead.priority, (priorityCounts.get(lead.priority) ?? 0) + 1);
  }
  const byPriority = [...priorityCounts.entries()].map(([priority, count]) => ({
    priority,
    count,
    percentOfTotal: totalLeads > 0 ? (count / totalLeads) * 100 : 0,
  }));

  function groupPerformance(keyOf: (lead: LeadWithRelations) => string): RatePerformance[] {
    const map = new Map<string, { total: number; won: number }>();
    for (const lead of leads) {
      const key = keyOf(lead);
      const entry = map.get(key) ?? { total: 0, won: 0 };
      entry.total += 1;
      if (lead.status === "Closed - Won") entry.won += 1;
      map.set(key, entry);
    }
    return [...map.entries()]
      .map(([name, { total, won }]) => ({ name, total, won, winRate: rate(total, won) }))
      .sort((a, b) => b.total - a.total);
  }

  const byManagerBase = groupPerformance((l) => l.assigned_agent?.name ?? "Unassigned");
  const overdueByManager = new Map<string, number>();
  for (const lead of openLeads) {
    if (getFollowUpAlert(lead.next_follow_up_at, lead.status) !== "Overdue") continue;
    const name = lead.assigned_agent?.name ?? "Unassigned";
    overdueByManager.set(name, (overdueByManager.get(name) ?? 0) + 1);
  }
  const byManager = byManagerBase.map((m) => ({ ...m, overdue: overdueByManager.get(m.name) ?? 0 }));

  const byProject = groupPerformance((l) => l.property_type?.name ?? "Unassigned");
  const bySource = groupPerformance((l) => l.lead_source?.name ?? "Unknown");

  const monthMap = new Map<string, number>();
  for (const lead of leads) {
    const key = format(new Date(lead.created_at), "yyyy-MM");
    monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
  }
  const byMonth = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ label: format(new Date(`${key}-01`), "MMM yyyy"), count }));

  const insights: FullAnalysisInsight[] = [];

  if (overdueFollowUps > 0) {
    const worstManager = [...overdueByManager.entries()].sort((a, b) => b[1] - a[1])[0];
    insights.push({
      severity: "critical",
      title: `${overdueFollowUps} overdue follow-up${overdueFollowUps === 1 ? "" : "s"}`,
      detail: worstManager
        ? `${worstManager[0]} has the most at ${worstManager[1]}. Overdue follow-ups are the fastest way to lose a warm client — clear the backlog first.`
        : "Clear the backlog before it costs a client.",
    });
  }

  const staleOpenLeads = openLeads.filter((l) => {
    const age = differenceInCalendarDays(now, new Date(l.created_at));
    return age > STALE_OPEN_DAYS && (activityCountByLead.get(l.id) ?? 0) === 0;
  });
  if (staleOpenLeads.length > 0) {
    insights.push({
      severity: "warning",
      title: `${staleOpenLeads.length} open lead${staleOpenLeads.length === 1 ? "" : "s"} older than ${STALE_OPEN_DAYS} days with no notes logged`,
      detail: "These leads have no recorded contact history at all — either they've gone cold, or the team's activity isn't being logged. Worth a manual check.",
    });
  }

  const uncontactedHotLeads = openLeads.filter((l) => {
    if (l.priority !== "Hot") return false;
    const lastActivity = lastActivityAtByLead.get(l.id);
    if (!lastActivity) return true;
    return differenceInCalendarDays(now, new Date(lastActivity)) > HOT_UNCONTACTED_DAYS;
  });
  if (uncontactedHotLeads.length > 0) {
    insights.push({
      severity: "critical",
      title: `${uncontactedHotLeads.length} Hot-priority lead${uncontactedHotLeads.length === 1 ? "" : "s"} without contact in the last ${HOT_UNCONTACTED_DAYS} days`,
      detail: "Hot leads are the closest to converting — and the most expensive to lose to a competitor through inaction.",
    });
  }

  const wonWithoutEvidence = wonLeads.filter((l) => !evidenceLeadSet.has(l.id));
  if (wonWithoutEvidence.length > 0) {
    insights.push({
      severity: "warning",
      title: `${wonWithoutEvidence.length} closed-won client${wonWithoutEvidence.length === 1 ? "" : "s"} with no evidence on file`,
      detail: "No screenshots or dated notes recorded proving contact — an ownership dispute on these clients would be hard to defend. Consider backfilling evidence for recent wins.",
    });
  }

  const ratedProjects = byProject.filter((p) => p.total >= MIN_VOLUME_FOR_RATE_COMPARISON);
  if (ratedProjects.length >= 2) {
    const best = [...ratedProjects].sort((a, b) => b.winRate - a.winRate)[0];
    const highestVolume = [...byProject].sort((a, b) => b.total - a.total)[0];
    if (highestVolume.total >= MIN_VOLUME_FOR_RATE_COMPARISON && highestVolume.name !== best.name) {
      insights.push({
        severity: "info",
        title: `${highestVolume.name} drives the most leads, but ${best.name} converts best`,
        detail: `${highestVolume.name}: ${highestVolume.total} leads at ${highestVolume.winRate.toFixed(0)}% won. ${best.name}: ${best.total} leads at ${best.winRate.toFixed(0)}% won. Worth understanding what's different about how ${best.name} leads are handled.`,
      });
    }
  }

  const ratedSources = bySource.filter((s) => s.total >= MIN_VOLUME_FOR_RATE_COMPARISON);
  if (ratedSources.length >= 2) {
    const bestSource = [...ratedSources].sort((a, b) => b.winRate - a.winRate)[0];
    insights.push({
      severity: "positive",
      title: `${bestSource.name} is the highest-converting lead source`,
      detail: `${bestSource.winRate.toFixed(0)}% of ${bestSource.total} leads from ${bestSource.name} closed won — among sources with at least ${MIN_VOLUME_FOR_RATE_COMPARISON} leads, this is the strongest return.`,
    });
  }

  const ratedManagers = byManager.filter((m) => m.total >= MIN_VOLUME_FOR_RATE_COMPARISON);
  if (ratedManagers.length >= 2) {
    const topManager = [...ratedManagers].sort((a, b) => b.winRate - a.winRate)[0];
    insights.push({
      severity: "positive",
      title: `${topManager.name} has the strongest close rate`,
      detail: `${topManager.winRate.toFixed(0)}% of ${topManager.total} assigned leads closed won.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      severity: "positive",
      title: "No urgent issues detected",
      detail: "Follow-ups are current, hot leads are being worked, and evidence coverage looks healthy.",
    });
  }

  return {
    generatedAt: now,
    overview: {
      totalLeads,
      openLeads: openLeads.length,
      wonLeads: wonLeads.length,
      lostLeads: lostLeads.length,
      conversionRate,
      overdueFollowUps,
      medianOpenLeadAgeDays,
      noteCoverage,
      evidenceCoverageOnWon,
    },
    byStatus: byStatusRows,
    byPriority,
    byManager,
    byProject,
    bySource,
    byMonth,
    insights,
  };
}
