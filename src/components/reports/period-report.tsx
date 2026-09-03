"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, FileDown, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { InsightCard } from "@/components/shared/insight-card";
import { BreakdownTable } from "@/components/shared/breakdown-table";
import { useProfile } from "@/components/providers/profile-provider";
import { useAssistant } from "@/components/providers/assistant-provider";
import {
  computePeriodReport,
  generatePeriodOptions,
  type PeriodType,
} from "@/lib/period-report";
import { generatePeriodReportPdf } from "@/lib/period-report-pdf";
import { formatKES } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ActivitySummary } from "@/lib/full-analysis";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { UnitSoldRow } from "@/lib/queries/units-sold";

/**
 * "How did last week/month actually go" — as opposed to Full Analysis,
 * which is an all-time snapshot. Every figure here is scoped to the
 * selected period and measured against the one immediately before it, so
 * the insights read as "compared to last time," not just raw totals.
 */
export function PeriodReport({
  leads,
  activitySummaries,
  unitsSold,
}: {
  leads: LeadWithRelations[];
  activitySummaries: ActivitySummary[];
  unitsSold: UnitSoldRow[];
}) {
  const profile = useProfile();
  const { openAssistant } = useAssistant();
  const [periodType, setPeriodType] = useState<PeriodType>("week");
  const [periodKey, setPeriodKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const periodOptions = useMemo(() => generatePeriodOptions(periodType), [periodType]);
  const selectedPeriod = periodOptions.find((p) => p.key === periodKey) ?? periodOptions[0];

  const report = useMemo(
    () => computePeriodReport(leads, activitySummaries, unitsSold, periodType, selectedPeriod),
    [leads, activitySummaries, unitsSold, periodType, selectedPeriod]
  );

  function handlePeriodTypeChange(next: PeriodType) {
    setPeriodType(next);
    setPeriodKey(null); // back to "current" whenever switching weekly/monthly
  }

  async function handleGeneratePdf() {
    setIsGenerating(true);
    try {
      await generatePeriodReportPdf({ report, generatedByName: profile?.full_name ?? null });
    } catch (err) {
      toast.error("Failed to generate report", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function handleAskAi() {
    const { current, previous } = report;
    const prompt = `Here's the ${report.period.label} report I'm looking at: ${current.newLeads} new leads (vs ${previous.newLeads} the ${periodType} before), ${current.won} won and ${current.lost} lost (${current.conversionRate.toFixed(1)}% conversion, vs ${previous.conversionRate.toFixed(1)}% before), ${current.unitsSoldCount} units sold worth ${formatKES(current.unitsSoldValue)} earning a ${formatKES(current.bonusEarned)} bonus. Top lost reasons: ${current.lostByReason.map((r) => `${r.reason} (${r.count})`).join(", ") || "none"}. Based on this, tell me in plain terms where to put more effort and what the setbacks were — you can also pull in get_full_analysis or search_leads if it helps explain any of these numbers.`;
    openAssistant(prompt);
  }

  const { current, previous } = report;

  const kpis: { label: string; value: number; formatter?: (n: number) => string; previous: number }[] = [
    { label: "New leads", value: current.newLeads, previous: previous.newLeads },
    { label: "Won", value: current.won, previous: previous.won },
    { label: "Lost", value: current.lost, previous: previous.lost },
    {
      label: "Conversion rate",
      value: current.conversionRate,
      formatter: (n) => `${n.toFixed(1)}%`,
      previous: previous.conversionRate,
    },
    { label: "Units sold", value: current.unitsSoldCount, previous: previous.unitsSoldCount },
    {
      label: "Bonus earned",
      value: current.bonusEarned,
      formatter: formatKES,
      previous: previous.bonusEarned,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          How this specific week or month went, measured against the one before it — where to
          put more effort, what the setbacks were, and what&apos;s worth knowing.
        </p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleAskAi}>
            <Sparkles className="size-4" />
            Ask AI
          </Button>
          <Button size="sm" onClick={handleGeneratePdf} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="animate-spin" /> : <FileDown className="size-4" />}
            Generate PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={periodType} onValueChange={(v) => handlePeriodTypeChange(v as PeriodType)}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedPeriod.key} onValueChange={setPeriodKey}>
          <SelectTrigger size="sm" className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="flex items-center text-xs text-muted-foreground">
          vs {report.previousPeriod.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              <AnimatedCounter value={kpi.value} formatter={kpi.formatter} />
            </p>
            <DeltaLabel current={kpi.value} previous={kpi.previous} />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Insights &amp; suggestions</h2>
        <div className="space-y-2">
          {report.insights.map((insight, i) => (
            <InsightCard key={i} insight={insight} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownTable
          title="By sales manager (closed this period)"
          columns={["Sales manager", "Closed", "Won", "Win rate"]}
          rows={current.byManager.map((m) => [
            m.name,
            String(m.total),
            String(m.won),
            `${m.winRate.toFixed(1)}%`,
          ])}
        />
        <BreakdownTable
          title="By source (closed this period)"
          columns={["Source", "Closed", "Won", "Win rate"]}
          rows={current.bySource.map((s) => [
            s.name,
            String(s.total),
            String(s.won),
            `${s.winRate.toFixed(1)}%`,
          ])}
        />
        <BreakdownTable
          title="By project (closed this period)"
          columns={["Project", "Closed", "Won", "Win rate"]}
          rows={current.byProject.map((p) => [
            p.name,
            String(p.total),
            String(p.won),
            `${p.winRate.toFixed(1)}%`,
          ])}
        />
        <BreakdownTable
          title="Why deals were lost this period"
          columns={["Reason", "Count"]}
          rows={current.lostByReason.map((r) => [r.reason, String(r.count)])}
        />
      </div>
    </div>
  );
}

function DeltaLabel({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return current > 0 ? (
      <p className="mt-1 text-xs text-muted-foreground">new this period</p>
    ) : null;
  }
  const change = ((current - previous) / previous) * 100;
  if (Math.abs(change) < 1) {
    return <p className="mt-1 text-xs text-muted-foreground">steady</p>;
  }
  const up = change > 0;
  return (
    <p className={cn("mt-1 flex items-center gap-0.5 text-xs", up ? "text-success" : "text-destructive")}>
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(change).toFixed(0)}%
    </p>
  );
}
