"use client";

import { useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { CHART_GRID, CHART_INK, chartLabelStyle, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import { Delta, TileHead, ViewToggle, formatKESCompact } from "@/components/dashboard/tile-parts";
import { formatKES } from "@/lib/format";
import type { SalesMonth } from "@/lib/dashboard-metrics";

/** Axis ticks stay short and whole: "150M", "800K". */
function axisKES(n: number): string {
  if (n >= 1_000_000_000) return `${+(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

/**
 * The headline tile: sales closed this month (sum of unit sale amounts,
 * never bonuses), the change against last month, and 12 months of history
 * as a chart or a table.
 */
export function SalesHeroTile({
  months,
  thisMonth,
  lastMonth,
  pipelineValue,
  totalLeads,
  projectName,
  versus,
}: {
  months: SalesMonth[];
  thisMonth: SalesMonth;
  lastMonth: SalesMonth;
  pipelineValue: number;
  totalLeads: number;
  projectName?: string | null;
  /** Last month's full name, e.g. "October". */
  versus: string;
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const data = months.map((m) => ({ label: m.label.split(" ")[0], full: m.label, value: m.value, units: m.units }));
  const hasSales = months.some((m) => m.value > 0);

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-3">
        <TileHead title={<>Sales closed{projectName ? ` · ${projectName}` : ""}</>}>
          <ViewToggle
            label="Sales view"
            value={view}
            onChange={setView}
            options={[
              { value: "chart", label: "Chart" },
              { value: "table", label: "Table" },
            ]}
          />
        </TileHead>

        <div>
          <p className="orion-figure text-4xl leading-[1.05] font-semibold tracking-tight tabular-nums sm:text-[2.6rem]">
            <AnimatedCounter value={thisMonth.value} formatter={formatKESCompact} />
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Delta current={thisMonth.value} previous={lastMonth.value} versus={versus} />
            <span className="text-xs text-muted-foreground">
              {thisMonth.units} {thisMonth.units === 1 ? "unit" : "units"} this month
            </span>
          </div>
        </div>

        {view === "chart" ? (
          <div
            className="min-h-[220px] flex-1"
            role="img"
            aria-label={`Sales closed per month for the last 12 months. Switch to Table for exact figures.`}
          >
            {hasSales ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={CHART_GRID} strokeOpacity={0.6} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: CHART_INK, fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis width={48} tickLine={false} axisLine={false} tick={{ fill: CHART_INK, fontSize: 11 }} tickFormatter={axisKES} />
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    labelStyle={chartLabelStyle}
                    cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4, strokeDasharray: "3 3" }}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ""}
                    formatter={(value, _name, item) => [
                      `${formatKES(Number(value))} · ${item?.payload?.units ?? 0} units`,
                      "Sales closed",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#sales-fill)"
                    dot={false}
                    activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2, fill: "var(--chart-1)" }}
                    animationDuration={1400}
                    animationEasing="ease-out"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No unit sales recorded in the last 12 months yet.
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-[220px] flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Sales closed per month</caption>
              <thead>
                <tr className="text-left text-[11px] text-muted-foreground">
                  <th className="pb-1.5 font-medium">Month</th>
                  <th className="pb-1.5 text-right font-medium">Units</th>
                  <th className="pb-1.5 text-right font-medium">Sales</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs tabular-nums">
                {[...months].reverse().map((m) => (
                  <tr key={m.key} className="border-t border-border/60">
                    <td className="py-1.5 font-sans">{m.label}</td>
                    <td className="py-1.5 text-right">{m.units}</td>
                    <td className="py-1.5 text-right">{formatKES(m.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-[var(--glass-border)] pt-3 text-xs text-muted-foreground">
          <span>
            Open pipeline <b className="font-semibold text-foreground tabular-nums">{formatKESCompact(pipelineValue)}</b> ·{" "}
            <b className="font-semibold text-foreground tabular-nums">{totalLeads.toLocaleString("en-US")}</b> leads in total
          </span>
          <Link href="/reports?tab=units-sold" className="font-medium text-foreground/80 underline-offset-4 hover:text-foreground hover:underline">
            Units sold report →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
