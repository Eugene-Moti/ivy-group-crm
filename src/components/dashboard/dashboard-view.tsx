"use client";

import { useMemo } from "react";
import { subWeeks } from "date-fns";
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
import { WON_STATUS_KEY } from "@/lib/constants";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PipelineByStatusChart } from "@/components/dashboard/pipeline-by-status-chart";
import { LeadsBySourceChart } from "@/components/dashboard/leads-by-source-chart";
import { LeadsOverTimeChart } from "@/components/dashboard/leads-over-time-chart";
import { PrioritySplitChart } from "@/components/dashboard/priority-split-chart";
import { AgentLeaderboard } from "@/components/dashboard/agent-leaderboard";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { NeedsAttentionCard } from "@/components/dashboard/needs-attention-card";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import type {
  computeAgentLeaderboard,
  computeKpis,
  computeKpiTrends,
  computeLeadsBySource,
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
  leadCreatedDates,
  agentLeaderboard,
  recentActivities,
}: {
  kpis: ReturnType<typeof computeKpis>;
  kpiTrends: ReturnType<typeof computeKpiTrends>;
  pipelineByStatus: ReturnType<typeof computePipelineByStatus>;
  prioritySplit: ReturnType<typeof computePrioritySplit>;
  leadsBySource: ReturnType<typeof computeLeadsBySource>;
  leadCreatedDates: string[];
  agentLeaderboard: ReturnType<typeof computeAgentLeaderboard>;
  recentActivities: ActivityWithLeadAndAuthor[];
}) {
  useRealtimeLeadsRefresh();

  const newThisWeekHref = useMemo(
    () => `/leads?since=${encodeURIComponent(subWeeks(new Date(), 1).toISOString().slice(0, 10))}`,
    []
  );

  return (
    <div className="space-y-6">
      <DashboardGreeting />

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
          href={newThisWeekHref}
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
          href={`/leads?status=${encodeURIComponent(WON_STATUS_KEY)}`}
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

      <NeedsAttentionCard />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LeadsOverTimeChart createdDates={leadCreatedDates} />
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
