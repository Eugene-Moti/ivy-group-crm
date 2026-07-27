"use client";

import {
  AlertTriangle,
  Percent,
  Trophy,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";

import { useRealtimeLeadsRefresh } from "@/hooks/use-realtime-leads-refresh";
import { formatKES } from "@/lib/format";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PipelineByStatusChart } from "@/components/dashboard/pipeline-by-status-chart";
import { LeadsBySourceChart } from "@/components/dashboard/leads-by-source-chart";
import { LeadsOverTimeChart } from "@/components/dashboard/leads-over-time-chart";
import { PrioritySplitChart } from "@/components/dashboard/priority-split-chart";
import { AgentLeaderboard } from "@/components/dashboard/agent-leaderboard";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import type {
  computeAgentLeaderboard,
  computeKpis,
  computeKpiTrends,
  computeLeadsBySource,
  computeLeadsOverTime,
  computePipelineByStatus,
  computePrioritySplit,
} from "@/lib/dashboard-metrics";
import type { ActivityWithLeadAndAuthor } from "@/lib/queries/activities";

export function DashboardView({
  kpis,
  kpiTrends,
  pipelineByStatus,
  prioritySplit,
  leadsBySource,
  leadsOverTime,
  agentLeaderboard,
  recentActivities,
}: {
  kpis: ReturnType<typeof computeKpis>;
  kpiTrends: ReturnType<typeof computeKpiTrends>;
  pipelineByStatus: ReturnType<typeof computePipelineByStatus>;
  prioritySplit: ReturnType<typeof computePrioritySplit>;
  leadsBySource: ReturnType<typeof computeLeadsBySource>;
  leadsOverTime: ReturnType<typeof computeLeadsOverTime>;
  agentLeaderboard: ReturnType<typeof computeAgentLeaderboard>;
  recentActivities: ActivityWithLeadAndAuthor[];
}) {
  useRealtimeLeadsRefresh();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Live overview of the Ivy Group buyer pipeline.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          icon={Users}
          label="Total leads"
          value={kpis.totalLeads}
          trend={kpiTrends.totalLeads}
          href="/leads"
        />
        <KpiCard
          icon={UserPlus}
          label="New this week"
          value={kpis.newThisWeek}
          trend={kpiTrends.newThisWeek}
          href="/leads"
        />
        <KpiCard
          icon={AlertTriangle}
          label="Overdue follow-ups"
          value={kpis.overdueFollowUps}
          accent={kpis.overdueFollowUps > 0}
          trend={kpiTrends.overdueFollowUps}
          href="/follow-ups"
        />
        <KpiCard
          icon={Trophy}
          label="Deals won"
          value={kpis.dealsWon}
          trend={kpiTrends.dealsWon}
          href={`/leads?status=${encodeURIComponent("Closed - Won")}`}
        />
        <KpiCard
          icon={Percent}
          label="Conversion rate"
          value={kpis.conversionRate}
          formatter={(n) => `${n.toFixed(1)}%`}
          trend={kpiTrends.conversionRate}
          href="/reports?tab=conversion"
        />
        <KpiCard
          icon={Wallet}
          label="Pipeline value"
          value={kpis.pipelineValue}
          formatter={(n) => formatKES(n)}
          trend={kpiTrends.pipelineValue}
          href="/leads"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeadsOverTimeChart data={leadsOverTime} />
        <PipelineByStatusChart data={pipelineByStatus} />
        <LeadsBySourceChart data={leadsBySource} />
        <PrioritySplitChart data={prioritySplit} />
        <AgentLeaderboard data={agentLeaderboard} />
        <div className="lg:col-span-2">
          <RecentActivityFeed activities={recentActivities} />
        </div>
      </div>
    </div>
  );
}
