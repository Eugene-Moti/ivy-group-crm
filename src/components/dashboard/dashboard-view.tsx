"use client";

import { useMemo } from "react";
import { subWeeks } from "date-fns";
import { motion, type Variants } from "framer-motion";
import { AlertTriangle, Percent, Trophy, UserPlus } from "lucide-react";

import { useRealtimeLeadsRefresh } from "@/hooks/use-realtime-leads-refresh";
import { WON_STATUS_KEY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { SalesHeroTile } from "@/components/dashboard/sales-hero-tile";
import { PipelineByStatusChart } from "@/components/dashboard/pipeline-by-status-chart";
import { LeadsBySourceChart } from "@/components/dashboard/leads-by-source-chart";
import { LeadsOverTimeChart } from "@/components/dashboard/leads-over-time-chart";
import { PrioritySplitChart } from "@/components/dashboard/priority-split-chart";
import { AgentLeaderboard } from "@/components/dashboard/agent-leaderboard";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { NeedsAttentionCard } from "@/components/dashboard/needs-attention-card";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { SpotlightTile } from "@/components/dashboard/spotlight-tile";
import { ProjectScope } from "@/components/dashboard/project-scope";
import type {
  computeAgentLeaderboard,
  computeKpis,
  computeKpiTrends,
  computeLeadsBySource,
  computePipelineByStatus,
  computePrioritySplit,
  computeSalesByMonth,
} from "@/lib/dashboard-metrics";
import type { ActivityWithLeadAndAuthor } from "@/lib/queries/activities";

const EASE = [0.22, 1, 0.36, 1] as const;

const grid: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.055 } } };
const tile: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
};

/** One bento cell: rises in with the stagger, then tilts toward the cursor with a gold spotlight. */
function Tile({ className, spotlightClassName, children }: { className?: string; spotlightClassName?: string; children: React.ReactNode }) {
  return (
    <motion.div variants={tile} className={cn("min-w-0", className)}>
      <SpotlightTile className={spotlightClassName}>{children}</SpotlightTile>
    </motion.div>
  );
}

/**
 * The "new face" dashboard: a bento grid of glass tiles over slow ambient
 * light (the light itself lives in the app shell). Every figure is computed
 * exactly as before (dashboard-metrics); only the presentation changed, plus
 * an optional project scope. Glass comes from the .orion-bento scope in
 * globals.css, which restyles each existing chart card in place.
 */
export function DashboardView({
  kpis,
  kpiTrends,
  pipelineByStatus,
  prioritySplit,
  leadsBySource,
  leadCreatedDates,
  agentLeaderboard,
  recentActivities,
  sales,
  projects,
  projectId,
}: {
  kpis: ReturnType<typeof computeKpis>;
  kpiTrends: ReturnType<typeof computeKpiTrends>;
  pipelineByStatus: ReturnType<typeof computePipelineByStatus>;
  prioritySplit: ReturnType<typeof computePrioritySplit>;
  leadsBySource: ReturnType<typeof computeLeadsBySource>;
  leadCreatedDates: string[];
  agentLeaderboard: ReturnType<typeof computeAgentLeaderboard>;
  recentActivities: ActivityWithLeadAndAuthor[];
  sales: ReturnType<typeof computeSalesByMonth>;
  projects: { id: string; name: string }[];
  projectId: string | null;
}) {
  useRealtimeLeadsRefresh();
  // Reduced motion is handled globally by MotionConfig (theme-provider).
  const motionProps = { variants: grid, initial: "hidden" as const, animate: "show" as const };

  const newThisWeekHref = useMemo(
    () =>
      // Scoped to Direct Client to match the KPI, which — like every metric
      // on this dashboard — excludes Real Estate Agent leads (a referral
      // channel, not client intake). Without the type filter the linked list
      // shows agent leads the count deliberately left out.
      `/leads?since=${encodeURIComponent(
        subWeeks(new Date(), 1).toISOString().slice(0, 10)
      )}&type=${encodeURIComponent("Direct Client")}`,
    []
  );

  return (
    <div className="relative space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <DashboardGreeting />
        <ProjectScope projects={projects} activeId={projectId} />
      </div>

      <motion.div
        {...motionProps}
        className="orion-bento grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:grid-rows-[auto_auto]"
      >
        <Tile className="sm:col-span-2 xl:row-span-2" spotlightClassName="orion-hero">
          <SalesHeroTile
            months={sales.months}
            thisMonth={sales.thisMonth}
            lastMonth={sales.lastMonth}
            pipelineValue={kpis.pipelineValue}
            totalLeads={kpis.totalLeads}
            projectName={projects.find((p) => p.id === projectId)?.name ?? null}
          />
        </Tile>
        <Tile>
          <KpiCard
            icon={UserPlus}
            label="New this week"
            value={kpis.newThisWeek}
            trend={kpiTrends.newThisWeek}
            href={newThisWeekHref}
          />
        </Tile>
        <Tile>
          <KpiCard
            icon={Trophy}
            label="Deals won"
            value={kpis.dealsWon}
            trend={kpiTrends.dealsWon}
            href={`/leads?status=${encodeURIComponent(WON_STATUS_KEY)}`}
          />
        </Tile>
        <Tile>
          <KpiCard
            icon={Percent}
            label="Conversion rate"
            value={kpis.conversionRate}
            formatter={(n) => `${n.toFixed(1)}%`}
            trend={kpiTrends.conversionRate}
            href="/reports?tab=conversion"
          />
        </Tile>
        <Tile>
          <KpiCard
            icon={AlertTriangle}
            label="Overdue follow-ups"
            value={kpis.overdueFollowUps}
            accent={kpis.overdueFollowUps > 0}
            trend={kpiTrends.overdueFollowUps}
            href="/follow-ups"
          />
        </Tile>
      </motion.div>

      <motion.div {...motionProps} className="orion-bento">
        <Tile>
          <NeedsAttentionCard />
        </Tile>
      </motion.div>

      <motion.div {...motionProps} className="orion-bento grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile className="sm:col-span-2">
          <PipelineByStatusChart data={pipelineByStatus} />
        </Tile>
        <Tile className="sm:col-span-2">
          <LeadsOverTimeChart createdDates={leadCreatedDates} />
        </Tile>
        <Tile className="sm:col-span-2">
          <LeadsBySourceChart data={leadsBySource} />
        </Tile>
        <Tile>
          <PrioritySplitChart data={prioritySplit} />
        </Tile>
        <Tile>
          <AgentLeaderboard data={agentLeaderboard} />
        </Tile>
        <Tile className="sm:col-span-2 xl:col-span-4">
          <RecentActivityFeed activities={recentActivities} />
        </Tile>
      </motion.div>
    </div>
  );
}
