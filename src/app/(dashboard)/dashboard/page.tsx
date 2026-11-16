import { addDays, format, startOfMonth, subDays, subMonths } from "date-fns";
import { getLeads, getPropertyTypes } from "@/lib/queries/leads";
import { getRecentActivities } from "@/lib/queries/activities";
import { getPipelineStages } from "@/lib/queries/settings";
import { getUnitsSold } from "@/lib/queries/units-sold";
import { getRemindersInWindow } from "@/lib/queries/reminders";
import {
  computeKpis,
  computeKpiTrends,
  computeLeadsBySource,
  computePipelineByStatus,
  computeSalesByMonth,
  conversionByMonth,
  countByMonth,
  topManagers,
  unitsByProject,
  type DashboardLead,
} from "@/lib/dashboard-metrics";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string | string[] }>;
}) {
  const { project } = await searchParams;
  const now = new Date();
  const [allLeads, allActivities, pipelineStages, allUnitsSold, projects, allReminders] = await Promise.all([
    getLeads(),
    getRecentActivities(60),
    getPipelineStages(),
    // Additive tiles: if one of these reads fails, the rest of the
    // dashboard still renders with that tile empty.
    getUnitsSold().catch(() => []),
    getPropertyTypes().catch(() => []),
    getRemindersInWindow(startOfMonth(subMonths(now, 11)).toISOString(), addDays(now, 2).toISOString()).catch(() => []),
  ]);

  // Optional project scope (?project=<id>, from the selector above the
  // tiles). Every figure below is computed from the scoped lists; an
  // unknown id just falls back to all projects.
  const projectId =
    typeof project === "string" && projects.some((p) => p.id === project) ? project : null;
  const leads = projectId ? allLeads.filter((l) => l.property_type_id === projectId) : allLeads;
  const scopedIds = new Set(leads.map((l) => l.id));
  const unitsSold = projectId ? allUnitsSold.filter((u) => scopedIds.has(u.lead_id)) : allUnitsSold;
  const reminders = projectId ? allReminders.filter((r) => scopedIds.has(r.lead_id)) : allReminders;
  const recentActivities = (
    projectId ? allActivities.filter((a) => a.lead_id && scopedIds.has(a.lead_id)) : allActivities
  ).slice(0, 15);

  // Real Estate Agent leads are a referral channel, not client deals — they
  // don't belong in lead counts, conversion rate, or pipeline value.
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

  const kpis = computeKpis(dashboardLeads, now);
  const kpiTrends = computeKpiTrends(dashboardLeads, now);
  const projectOfLead = new Map(allLeads.map((l) => [l.id, l.property_type ? { id: l.property_type.id, name: l.property_type.name } : null]));
  const managerOfLead = new Map(allLeads.map((l) => [l.id, l.assigned_agent ? { id: l.assigned_agent.id, name: l.assigned_agent.name } : null]));
  const lastMonth = subMonths(now, 1);

  return (
    <DashboardView
      kpis={kpis}
      overdueTrend={kpiTrends.overdueFollowUps}
      overdueLabels={Array.from({ length: 7 }, (_, i) => format(subDays(now, 6 - i), "EEE d MMM"))}
      newLeads={countByMonth(dashboardLeads.map((l) => l.created_at), now)}
      visits={countByMonth(reminders.map((r) => r.remind_at), now)}
      conversion={conversionByMonth(dashboardLeads, now)}
      pipelineByStatus={computePipelineByStatus(dashboardLeads, pipelineStages)}
      leadsBySource={computeLeadsBySource(dashboardLeads)}
      sales={computeSalesByMonth(unitsSold, now)}
      units={unitsByProject(unitsSold, projectOfLead)}
      managers={topManagers(unitsSold, managerOfLead, now)}
      recentActivities={recentActivities}
      reminderTimes={reminders.filter((r) => new Date(r.remind_at) >= subDays(now, 1)).map((r) => r.remind_at)}
      periodLabel={format(now, "MMMM yyyy")}
      versusLabel={format(lastMonth, "MMMM")}
      newLeadsHref={`/leads?since=${format(startOfMonth(now), "yyyy-MM-dd")}&type=${encodeURIComponent("Direct Client")}`}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      projectId={projectId}
    />
  );
}
