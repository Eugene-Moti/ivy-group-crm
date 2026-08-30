"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileDown,
  Info,
  Loader2,
  OctagonAlert,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CHART_GOLD, CHART_GRID, CHART_INK, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import { EmptyChartState } from "@/components/dashboard/empty-chart-state";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { useProfile } from "@/components/providers/profile-provider";
import { usePipelineStages, useStatusLabels } from "@/components/providers/status-labels-provider";
import { computeFullAnalysis, type ActivitySummary, type EvidenceLeadId, type FullAnalysisInsight } from "@/lib/full-analysis";
import { generateFullAnalysisReport } from "@/lib/full-analysis-report";
import { useAssistant } from "@/components/providers/assistant-provider";
import { WON_STATUS_KEY, LOST_STATUS_KEY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { LeadWithRelations } from "@/lib/queries/leads";

const SEVERITY_META: Record<
  FullAnalysisInsight["severity"],
  { icon: typeof AlertTriangle; className: string }
> = {
  critical: { icon: OctagonAlert, className: "border-l-destructive text-destructive" },
  warning: { icon: AlertTriangle, className: "border-l-gold text-gold" },
  positive: { icon: CheckCircle2, className: "border-l-success text-success" },
  info: { icon: Info, className: "border-l-ivy-800 text-foreground" },
};

export function FullAnalysisReport({
  leads,
  activitySummaries,
  evidenceLeadIds,
}: {
  leads: LeadWithRelations[];
  activitySummaries: ActivitySummary[];
  evidenceLeadIds: EvidenceLeadId[];
}) {
  const statusLabels = useStatusLabels();
  const stages = usePipelineStages();
  const profile = useProfile();
  const { openAssistant } = useAssistant();
  const [isGenerating, setIsGenerating] = useState(false);

  const analysis = useMemo(
    () => computeFullAnalysis(leads, activitySummaries, evidenceLeadIds, statusLabels, stages),
    [leads, activitySummaries, evidenceLeadIds, statusLabels, stages]
  );

  async function handleGeneratePdf() {
    setIsGenerating(true);
    try {
      await generateFullAnalysisReport({
        analysis,
        reportTitle: "Full Analysis Report",
        generatedByName: profile?.full_name ?? null,
      });
    } catch (err) {
      toast.error("Failed to generate report", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsGenerating(false);
    }
  }

  const { overview } = analysis;
  const pct1 = (n: number) => `${n.toFixed(1)}%`;
  const pct0 = (n: number) => `${n.toFixed(0)}%`;
  const kpis: { label: string; value: number; formatter?: (n: number) => string; href?: string }[] = [
    { label: "Total leads", value: overview.totalLeads, href: "/leads" },
    { label: "Open pipeline", value: overview.openLeads },
    {
      label: "Leads Won",
      value: overview.wonLeads,
      href: `/leads?status=${encodeURIComponent(WON_STATUS_KEY)}`,
    },
    {
      label: "Leads Lost",
      value: overview.lostLeads,
      href: `/leads?status=${encodeURIComponent(LOST_STATUS_KEY)}`,
    },
    { label: "Conversion rate", value: overview.conversionRate, formatter: pct1 },
    { label: "Overdue follow-ups", value: overview.overdueFollowUps, href: "/follow-ups" },
    {
      label: "Median open-lead age",
      value: overview.medianOpenLeadAgeDays,
      formatter: (n) => `${n.toFixed(0)}d`,
    },
    { label: "Notes coverage", value: overview.noteCoverage, formatter: pct0 },
    { label: "Won leads with evidence", value: overview.evidenceCoverageOnWon, formatter: pct0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every lead, sales manager, project, and source — rolled into one premium,
          shareable summary with data-driven suggestions on where to focus next.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              openAssistant(
                "Summarize the current Full Analysis insights and tell me what to prioritize this week."
              )
            }
          >
            <Sparkles className="size-4" />
            Ask AI
          </Button>
          <Button size="sm" onClick={handleGeneratePdf} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="animate-spin" /> : <FileDown className="size-4" />}
            Generate PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => {
          const tile = (
            <div
              className={cn(
                "rounded-xl border border-border bg-card p-3",
                kpi.href && "transition-colors hover:border-gold/50"
              )}
            >
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p className="mt-1 text-xl font-semibold tabular-nums">
                <AnimatedCounter value={kpi.value} formatter={kpi.formatter} />
              </p>
            </div>
          );
          return kpi.href ? (
            <Link key={kpi.label} href={kpi.href}>
              {tile}
            </Link>
          ) : (
            <div key={kpi.label}>{tile}</div>
          );
        })}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Insights &amp; suggestions</h2>
        <div className="space-y-2">
          {analysis.insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Leads by month
          </CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {analysis.byMonth.some((m) => m.count > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analysis.byMonth} margin={{ left: -16, right: 8 }}>
                <defs>
                  <linearGradient id="fullAnalysisFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_GOLD} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={CHART_GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART_GRID} />
                <XAxis dataKey="label" tick={{ fill: CHART_INK, fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fill: CHART_INK, fontSize: 12 }} allowDecimals={false} width={32} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={CHART_GOLD}
                  strokeWidth={2}
                  fill="url(#fullAnalysisFill)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChartState message="No leads yet." />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownTable
          title="By sales manager"
          columns={["Sales manager", "Leads", "Won", "Win rate", "Overdue"]}
          rows={analysis.byManager.map((m) => [
            m.name,
            String(m.total),
            String(m.won),
            `${m.winRate.toFixed(1)}%`,
            String(m.overdue),
          ])}
        />
        <BreakdownTable
          title="By project"
          columns={["Project", "Leads", "Won", "Win rate"]}
          rows={analysis.byProject.map((p) => [
            p.name,
            String(p.total),
            String(p.won),
            `${p.winRate.toFixed(1)}%`,
          ])}
        />
        <BreakdownTable
          title="By lead source"
          columns={["Source", "Leads", "Won", "Win rate"]}
          rows={analysis.bySource.map((s) => [
            s.name,
            String(s.total),
            String(s.won),
            `${s.winRate.toFixed(1)}%`,
          ])}
        />
        <BreakdownTable
          title="By status"
          columns={["Status", "Leads", "% of total"]}
          rows={analysis.byStatus
            .filter((s) => s.count > 0)
            .map((s) => [s.label, String(s.count), `${s.percentOfTotal.toFixed(1)}%`])}
        />
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: FullAnalysisInsight }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SEVERITY_META[insight.severity];
  const Icon = meta.icon;
  const hasLeads = !!insight.leads?.length;

  return (
    <div
      className={cn(
        "rounded-xl border border-border border-l-4 bg-card p-3",
        meta.className
      )}
    >
      <button
        type="button"
        onClick={() => hasLeads && setExpanded((v) => !v)}
        disabled={!hasLeads}
        className={cn(
          "flex w-full items-start gap-3 text-left",
          hasLeads && "cursor-pointer"
        )}
      >
        <Icon className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{insight.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{insight.detail}</p>
        </div>
        {hasLeads && (
          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        )}
      </button>
      {hasLeads && expanded && (
        <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
          {insight.leads!.map((lead) => (
            <li key={lead.id}>
              <Link
                href={`/leads/${lead.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-gold/50 hover:text-gold"
              >
                {lead.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BreakdownTable({
  title,
  columns,
  rows,
}: {
  title: string;
  columns: string[];
  rows: string[][];
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c}>{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className={j === 0 ? "font-medium" : undefined}>
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-20 text-center text-muted-foreground">
                  No data yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
