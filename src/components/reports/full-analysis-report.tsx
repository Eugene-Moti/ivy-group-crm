"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FileDown,
  Info,
  Loader2,
  OctagonAlert,
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
import { useProfile } from "@/components/providers/profile-provider";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import { computeFullAnalysis, type ActivitySummary, type EvidenceLeadId, type FullAnalysisInsight } from "@/lib/full-analysis";
import { generateFullAnalysisReport } from "@/lib/full-analysis-report";
import { cn } from "@/lib/utils";
import type { LeadWithRelations } from "@/lib/queries/leads";

const SEVERITY_META: Record<
  FullAnalysisInsight["severity"],
  { icon: typeof AlertTriangle; className: string }
> = {
  critical: { icon: OctagonAlert, className: "border-l-destructive text-destructive" },
  warning: { icon: AlertTriangle, className: "border-l-gold text-gold" },
  positive: { icon: CheckCircle2, className: "border-l-[#3A8C5C] text-[#3A8C5C]" },
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
  const profile = useProfile();
  const [isGenerating, setIsGenerating] = useState(false);

  const analysis = useMemo(
    () => computeFullAnalysis(leads, activitySummaries, evidenceLeadIds, statusLabels),
    [leads, activitySummaries, evidenceLeadIds, statusLabels]
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
  const kpis: { label: string; value: string; href?: string }[] = [
    { label: "Total leads", value: String(overview.totalLeads), href: "/leads" },
    { label: "Open pipeline", value: String(overview.openLeads) },
    {
      label: "Closed — Won",
      value: String(overview.wonLeads),
      href: `/leads?status=${encodeURIComponent("Closed - Won")}`,
    },
    {
      label: "Closed — Lost",
      value: String(overview.lostLeads),
      href: `/leads?status=${encodeURIComponent("Closed - Lost")}`,
    },
    { label: "Conversion rate", value: `${overview.conversionRate.toFixed(1)}%` },
    { label: "Overdue follow-ups", value: String(overview.overdueFollowUps), href: "/follow-ups" },
    { label: "Median open-lead age", value: `${overview.medianOpenLeadAgeDays.toFixed(0)}d` },
    { label: "Notes coverage", value: `${overview.noteCoverage.toFixed(0)}%` },
    { label: "Won leads with evidence", value: `${overview.evidenceCoverageOnWon.toFixed(0)}%` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Every lead, sales manager, project, and source — rolled into one premium,
          shareable summary with data-driven suggestions on where to focus next.
        </p>
        <Button size="sm" onClick={handleGeneratePdf} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="animate-spin" /> : <FileDown className="size-4" />}
          Generate PDF
        </Button>
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
              <p className="mt-1 text-xl font-semibold tabular-nums">{kpi.value}</p>
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
          {analysis.insights.map((insight, i) => {
            const meta = SEVERITY_META[insight.severity];
            const Icon = meta.icon;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-border border-l-4 bg-card p-3",
                  meta.className
                )}
              >
                <Icon className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{insight.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{insight.detail}</p>
                </div>
              </div>
            );
          })}
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
