import { getLeads, getPropertyTypes } from "@/lib/queries/leads";
import { getRecentActivities } from "@/lib/queries/activities";
import { getPipelineStages } from "@/lib/queries/settings";
import { getUnitsSold } from "@/lib/queries/units-sold";
import {
  computeAgentLeaderboard,
  computeKpis,
  computeKpiTrends,
  computeLeadsBySource,
  computePipelineByStatus,
  computePrioritySplit,
  computeSalesByMonth,
  type DashboardLead,
} from "@/lib/dashboard-metrics";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] }>;
}) {
  const { project } = await searchParams;
  const [allLeads, allActivities, pipelineStages, allUnitsSold, projects] = await Promise.all([
    getLeads(),
    getRecentActivities(60),
    getPipelineStages(),
    // The sales tile is additive — if this read fails, the rest of the
    // dashboard still renders with the tile showing zero.
    getUnitsSold().catch(() => []),
    getPropertyTypes().catch(() => []),
  ]);

  // Optional project scope (?project=<id>, from the selector above the
  // tiles). Every figure below is computed from the scoped lists exactly as
  // before; an unknown id just falls back to all projects.
  const projectId =
    typeof project === "string" && projects.some((p) => p.id === project) ? project : null;
  const leads = projectId ? allLeads.filter((l) => l.property_type_id === projectId) : allLeads;
  const scopedIds = new Set(leads.map((l) => l.id));
  const unitsSold = projectId ? allUnitsSold.filter((u) => scopedIds.has(u.lead_id)) : allUnitsSold;
  const recentActivities = (
    projectId ? allActivities.filter((a) => a.lead_id && scopedIds.has(a.lead_id)) : allActivities
  ).slice(0, 15);

  // Real Estate Agent leads are a referral channel, not client deals — they
  // don't belong in "total leads," conversion rate, or pipeline value.
  const clientLeads = leads.filter((lead) => lead.lead_type !== "Real Estate Agent");

  const dashboardLeads: DashboardLead[] = clientLeads.map((lead) => ({
    id: lead.id,
    status: lead.status,
    priority: lead.priority,
    budget_min: lead.budget_min,
    budget_max: lead.budget_max,
    created_at: lead.created_at,
    next_follow_up_at: lead.next_follow_up_at,
    lead_source_id: lead.lead_source_id,
    lead_source_name: lead.lead_source?.name ?? null,
    assigned_to: lead.assigned_to,
    assigned_agent_name: lead.assigned_agent?.name ?? null,
  }));

  const now = new Date();

  const kpis = computeKpis(dashboardLeads, now);
  const kpiTrends = computeKpiTrends(dashboardLeads, now);
  const pipelineByStatus = computePipelineByStatus(dashboardLeads, pipelineStages);
  const prioritySplit = computePrioritySplit(dashboardLeads);
  const leadsBySource = computeLeadsBySource(dashboardLeads);
  const agentLeaderboard = computeAgentLeaderboard(dashboardLeads);
  const leadCreatedDates = dashboardLeads.map((l) => l.created_at);
  const sales = computeSalesByMonth(unitsSold, now);

  return (
    <DashboardView
      kpis={kpis}
      kpiTrends={kpiTrends}
      pipelineByStatus={pipelineByStatus}
      prioritySplit={prioritySplit}
      leadsBySource={leadsBySource}
      leadCreatedDates={leadCreatedDates}
      agentLeaderboard={agentLeaderboard}
      recentActivities={recentActivities}
      sales={sales}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      projectId={projectId}
    />
  );
}
