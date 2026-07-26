import { getLeads } from "@/lib/queries/leads";
import { getRecentActivities } from "@/lib/queries/activities";
import {
  computeAgentLeaderboard,
  computeKpis,
  computeKpiTrends,
  computeLeadsBySource,
  computeLeadsOverTime,
  computePipelineByStatus,
  computePrioritySplit,
  type DashboardLead,
} from "@/lib/dashboard-metrics";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const [leads, recentActivities] = await Promise.all([
    getLeads(),
    getRecentActivities(15),
  ]);

  const dashboardLeads: DashboardLead[] = leads.map((lead) => ({
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
  const pipelineByStatus = computePipelineByStatus(dashboardLeads);
  const prioritySplit = computePrioritySplit(dashboardLeads);
  const leadsBySource = computeLeadsBySource(dashboardLeads);
  const leadsOverTime = computeLeadsOverTime(dashboardLeads, now);
  const agentLeaderboard = computeAgentLeaderboard(dashboardLeads);

  return (
    <DashboardView
      kpis={kpis}
      kpiTrends={kpiTrends}
      pipelineByStatus={pipelineByStatus}
      prioritySplit={prioritySplit}
      leadsBySource={leadsBySource}
      leadsOverTime={leadsOverTime}
      agentLeaderboard={agentLeaderboard}
      recentActivities={recentActivities}
    />
  );
}
