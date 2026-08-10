import { CLOSED_STATUS_KEYS, WON_STATUS_KEY } from "@/lib/constants";
import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

const OFFER_STAGE_KEY = "offer_made";
const NEGOTIATING_STAGE_KEY = "negotiating";
const VIEWING_STAGE_KEY = "viewing_scheduled";

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

export type ManagerBreakdownRow = {
  managerName: string;
  directClientCount: number;
  agentCount: number;
  total: number;
};

export type MarketingReport = {
  offerStageCount: number;
  negotiatingCount: number;
  siteVisitCount: number;
  topSource: MarketingSourceRow | null;
  offerStage: MarketingLeadRow[];
  negotiating: MarketingLeadRow[];
  siteVisits: MarketingLeadRow[];
  sourcePerformance: MarketingSourceRow[];
  managerBreakdown: ManagerBreakdownRow[];
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
 * A tightly curated share-out for the marketing team: who's at the offer
 * stage, who's negotiating, who has a site visit/meeting booked, which
 * sources are converting, and how each sales manager's active workload
 * splits between direct clients and referring agents. Client contact
 * details and budgets are intentionally left out.
 */
export function computeMarketingReport(
  leads: LeadWithRelations[],
  statusLabels: Record<string, string>
): MarketingReport {
  const clientLeads = leads.filter((l) => l.lead_type !== "Real Estate Agent");
  const activeClientLeads = clientLeads.filter((l) => !CLOSED_STATUS_KEYS.includes(l.status));

  const offerStage = activeClientLeads.filter((l) => l.status === OFFER_STAGE_KEY);
  const negotiating = activeClientLeads.filter((l) => l.status === NEGOTIATING_STAGE_KEY);
  const siteVisits = activeClientLeads.filter((l) => l.status === VIEWING_STAGE_KEY);

  const sourceMap = new Map<string, { total: number; won: number }>();
  for (const lead of clientLeads) {
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

  const activeLeads = leads.filter((l) => !CLOSED_STATUS_KEYS.includes(l.status));
  const managerMap = new Map<string, { directClient: number; agent: number }>();
  for (const lead of activeLeads) {
    const name = lead.assigned_agent?.name ?? "Unassigned";
    const entry = managerMap.get(name) ?? { directClient: 0, agent: 0 };
    if (lead.lead_type === "Real Estate Agent") entry.agent += 1;
    else entry.directClient += 1;
    managerMap.set(name, entry);
  }
  const managerBreakdown = [...managerMap.entries()]
    .map(([managerName, { directClient, agent }]) => ({
      managerName,
      directClientCount: directClient,
      agentCount: agent,
      total: directClient + agent,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    offerStageCount: offerStage.length,
    negotiatingCount: negotiating.length,
    siteVisitCount: siteVisits.length,
    topSource,
    offerStage: offerStage.map((l) => toRow(l, statusLabels)),
    negotiating: negotiating.map((l) => toRow(l, statusLabels)),
    siteVisits: siteVisits.map((l) => toRow(l, statusLabels)),
    sourcePerformance,
    managerBreakdown,
  };
}
