import { differenceInCalendarDays } from "date-fns";
import { CLOSED_STATUS_KEYS, WON_STATUS_KEY } from "@/lib/constants";
import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { ActivitySummary } from "@/lib/full-analysis";

const RECENT_CONTACT_DAYS = 7;
const OFFER_STAGE_KEY = "offer_made";

/**
 * A deliberately redacted lead row for sharing outside the sales team —
 * phone, email, and budget are never included here, even though the admin
 * generating the report can see them elsewhere. Names, projects, sources,
 * and pipeline stage are considered safe to share.
 */
export type MarketingLeadRow = {
  id: string;
  name: string;
  leadType: string;
  project: string;
  location: string;
  source: string;
  statusLabel: string;
  managerName: string;
  priority: string;
};

export type MarketingSourceRow = { source: string; total: number; won: number; winRate: number };

export type MarketingReport = {
  totalActive: number;
  hotCount: number;
  offerStageCount: number;
  topSource: MarketingSourceRow | null;
  hotLeads: MarketingLeadRow[];
  promising: MarketingLeadRow[];
  offerStage: MarketingLeadRow[];
  sourcePerformance: MarketingSourceRow[];
};

function toRow(lead: LeadWithRelations, statusLabels: Record<string, string>): MarketingLeadRow {
  return {
    id: lead.id,
    name: fullName(lead),
    leadType: lead.lead_type,
    project: lead.property_type?.name ?? "—",
    location: lead.preferred_area ?? "—",
    source: lead.lead_source?.name ?? "—",
    statusLabel: statusLabels[lead.status] ?? lead.status,
    managerName: lead.assigned_agent?.name ?? "Unassigned",
    priority: lead.priority,
  };
}

/**
 * Everything a marketing-team share-out needs to understand pipeline
 * momentum — hot leads, promising activity, who's at the offer stage, and
 * which sources are converting — with client contact details intentionally
 * left out.
 */
export function computeMarketingReport(
  leads: LeadWithRelations[],
  activitySummaries: ActivitySummary[],
  statusLabels: Record<string, string>,
  now: Date = new Date()
): MarketingReport {
  const activeLeads = leads.filter((l) => !CLOSED_STATUS_KEYS.includes(l.status));

  const lastActivityAtByLead = new Map<string, string>();
  for (const a of activitySummaries) {
    const existing = lastActivityAtByLead.get(a.lead_id);
    if (!existing || new Date(a.created_at) > new Date(existing)) {
      lastActivityAtByLead.set(a.lead_id, a.created_at);
    }
  }

  const hot = activeLeads.filter((l) => l.priority === "Hot");
  const promising = hot.filter((l) => {
    const lastActivity = lastActivityAtByLead.get(l.id);
    if (!lastActivity) return false;
    return differenceInCalendarDays(now, new Date(lastActivity)) <= RECENT_CONTACT_DAYS;
  });
  const offerStage = activeLeads.filter((l) => l.status === OFFER_STAGE_KEY);

  const sourceMap = new Map<string, { total: number; won: number }>();
  for (const lead of leads) {
    const name = lead.lead_source?.name ?? "Unknown";
    const entry = sourceMap.get(name) ?? { total: 0, won: 0 };
    entry.total += 1;
    if (lead.status === WON_STATUS_KEY) entry.won += 1;
    sourceMap.set(name, entry);
  }
  const sourcePerformance = [...sourceMap.entries()]
    .map(([source, { total, won }]) => ({
      source,
      total,
      won,
      winRate: total > 0 ? (won / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const ratedSources = sourcePerformance.filter((s) => s.total >= 3);
  const topSource = ratedSources.length
    ? [...ratedSources].sort((a, b) => b.winRate - a.winRate)[0]
    : null;

  return {
    totalActive: activeLeads.length,
    hotCount: hot.length,
    offerStageCount: offerStage.length,
    topSource,
    hotLeads: hot.map((l) => toRow(l, statusLabels)),
    promising: promising.map((l) => toRow(l, statusLabels)),
    offerStage: offerStage.map((l) => toRow(l, statusLabels)),
    sourcePerformance,
  };
}
