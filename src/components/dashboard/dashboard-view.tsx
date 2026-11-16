"use client";

import { motion, type Variants } from "framer-motion";
import { AlarmClock, MapPin, Percent, UserPlus } from "lucide-react";

import { useRealtimeLeadsRefresh } from "@/hooks/use-realtime-leads-refresh";
import { cn } from "@/lib/utils";
import { SalesHeroTile } from "@/components/dashboard/sales-hero-tile";
import { StatTile } from "@/components/dashboard/stat-tile";
import { PipelineTile, SourcesTile } from "@/components/dashboard/bars-tiles";
import { UnitsTile } from "@/components/dashboard/units-tile";
import { ManagersTile } from "@/components/dashboard/managers-tile";
import { AttentionTile } from "@/components/dashboard/attention-tile";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { DashboardGreeting } from "@/components/dashboard/dashboard-greeting";
import { SpotlightTile } from "@/components/dashboard/spotlight-tile";
import { ProjectScope } from "@/components/dashboard/project-scope";
import type {
  computeKpis,
  computeLeadsBySource,
  computePipelineByStatus,
  computeSalesByMonth,
  ManagerRow,
  MonthSeries,
  ProjectUnits,
} from "@/lib/dashboard-metrics";
import type { ActivityWithLeadAndAuthor } from "@/lib/queries/activities";

const EASE = [0.22, 1, 0.36, 1] as const;

const grid: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.055 } } };
const tile: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.56, ease: EASE } },
};

/** One bento cell: rises in with the stagger, then tilts toward the cursor with a gold spotlight. */
function Tile({ className, spotlightClassName, children }: { className?: string; spotlightClassName?: string; children: React.ReactNode }) {
  return (
    <motion.div variants={tile} className={cn("min-w-0", className)}>
      <SpotlightTile className={spotlightClassName}>{children}</SpotlightTile>
    </motion.div>
  );
}

const pct = (n: number) => `${n.toFixed(1)}%`;

/**
 * The "new face" dashboard, laid out like the brand board: the sales hero
 * with four stat tiles beside it, then pipeline and unit inventory, then
 * lead sources, sales managers and what needs attention. Glass is kept to
 * the frame and headline figures; dense tables sit on near-solid panels
 * (.orion-solid) so they stay easy to read. Reduced motion is handled
 * globally by MotionConfig (theme-provider).
 */
export function DashboardView({
  kpis,
  overdueTrend,
  overdueLabels,
  newLeads,
  visits,
  conversion,
  pipelineByStatus,
  leadsBySource,
  sales,
  units,
  managers,
  recentActivities,
  reminderTimes,
  periodLabel,
  versusLabel,
  newLeadsHref,
  projects,
  projectId,
}: {
  kpis: ReturnType<typeof computeKpis>;
  overdueTrend: number[];
  overdueLabels: string[];
  newLeads: MonthSeries;
  visits: MonthSeries;
  conversion: MonthSeries;
  pipelineByStatus: ReturnType<typeof computePipelineByStatus>;
  leadsBySource: ReturnType<typeof computeLeadsBySource>;
  sales: ReturnType<typeof computeSalesByMonth>;
  units: ProjectUnits[];
  managers: { monthLabel: string; rows: ManagerRow[] };
  recentActivities: ActivityWithLeadAndAuthor[];
  reminderTimes: string[];
  periodLabel: string;
  versusLabel: string;
  newLeadsHref: string;
  projects: { id: string; name: string }[];
  projectId: string | null;
}) {
  useRealtimeLeadsRefresh();
  const motionProps = { variants: grid, initial: "hidden" as const, animate: "show" as const };
  const short = (labels: string[]) => labels.map((l) => l.split(" ")[0]);

  return (
    <div className="relative space-y-5">
      <DashboardGreeting reminderTimes={reminderTimes} />

      <div className="flex flex-wrap items-center gap-2.5">
        <ProjectScope projects={projects} activeId={projectId} />
        <span className="orion-glass rounded-full px-3.5 py-2 text-xs font-medium">
          {periodLabel} · compared with {versusLabel}
        </span>
      </div>

      <motion.div {...motionProps} className="orion-bento grid grid-flow-row-dense grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile className="sm:col-span-2 xl:row-span-2" spotlightClassName="orion-hero">
          <SalesHeroTile
            months={sales.months}
            thisMonth={sales.thisMonth}
            lastMonth={sales.lastMonth}
            pipelineValue={kpis.pipelineValue}
            totalLeads={kpis.totalLeads}
            projectName={projects.find((p) => p.id === projectId)?.name ?? null}
            versus={versusLabel}
          />
        </Tile>
        <Tile>
          <StatTile
            icon={UserPlus}
            label="New leads"
            value={newLeads.current}
            previous={newLeads.previous}
            versus={versusLabel}
            series={newLeads.values}
            seriesLabels={short(newLeads.labels)}
            href={newLeadsHref}
          />
        </Tile>
        <Tile>
          <StatTile
            icon={MapPin}
            label="Visits & meetings booked"
            value={visits.current}
            previous={visits.previous}
            versus={versusLabel}
            series={visits.values}
            seriesLabels={short(visits.labels)}
            href="/follow-ups"
          />
        </Tile>
        <Tile>
          <StatTile
            icon={Percent}
            label="Lead to sale"
            value={conversion.current}
            format={pct}
            previous={conversion.previous}
            versus={versusLabel}
            points
            series={conversion.values}
            seriesLabels={short(conversion.labels)}
            href="/reports?tab=conversion"
          />
        </Tile>
        <Tile>
          <StatTile
            icon={AlarmClock}
            label="Overdue follow-ups"
            value={kpis.overdueFollowUps}
            caption="Past their follow-up date · last 7 days"
            series={overdueTrend}
            seriesLabels={overdueLabels}
            warn
            href="/follow-ups"
          />
        </Tile>

        <Tile className="sm:col-span-2">
          <PipelineTile data={pipelineByStatus} />
        </Tile>
        <Tile className="sm:col-span-2">
          <UnitsTile projects={units} />
        </Tile>

        <Tile>
          <SourcesTile data={leadsBySource} />
        </Tile>
        <Tile className="sm:col-span-2">
          <ManagersTile monthLabel={managers.monthLabel} rows={managers.rows} />
        </Tile>
        <Tile className="sm:col-span-2 xl:col-span-1">
          <AttentionTile overdueFollowUps={kpis.overdueFollowUps} />
        </Tile>

        <Tile className="sm:col-span-2 xl:col-span-4">
          <RecentActivityFeed activities={recentActivities} />
        </Tile>
      </motion.div>
    </div>
  );
}
