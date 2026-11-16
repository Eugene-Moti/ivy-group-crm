"use client";

import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { CHART_GRID, CHART_INK, chartLabelStyle, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import { formatKES } from "@/lib/format";
import type { SalesMonth } from "@/lib/dashboard-metrics";
import { cn } from "@/lib/utils";

function compactKES(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

/**
 * The dashboard's headline tile: closed sales this month (from units_sold),
 * the change against last month, and a 12-month trend. Pipeline value and
 * total leads ride along underneath, so the two KPIs that used to have
 * their own cards are still one glance away.
 */
export function SalesHeroTile({
  months,
  thisMonth,
  lastMonth,
  pipelineValue,
  totalLeads,
}: {
  months: SalesMonth[];
  thisMonth: SalesMonth;
  lastMonth: SalesMonth;
  pipelineValue: number;
  totalLeads: number;
}) {
  const monthName = thisMonth.label.split(" ")[0];
  const delta = lastMonth.value > 0 ? ((thisMonth.value - lastMonth.value) / lastMonth.value) * 100 : null;
  const data = months.map((m) => ({ label: m.label.split(" ")[0], full: m.label, value: m.value, units: m.units }));
  const hasSales = months.some((m) => m.value > 0);

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">Sales closed · {monthName}</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
              <AnimatedCounter value={thisMonth.value} formatter={(n) => formatKES(n)} />
            </p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs">
              {delta !== null && (
                <span className={cn("font-semibold", delta >= 0 ? "text-evergreen-soft" : "text-destructive")}>
                  {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
                </span>
              )}
              <span className="text-muted-foreground">
                {thisMonth.units} {thisMonth.units === 1 ? "unit" : "units"} this month
                {delta !== null && " · vs last month"}
              </span>
            </p>
          </div>
          <Link
            href="/reports?tab=units-sold"
            className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground"
          >
            Units sold report
          </Link>
        </div>

        <div className="min-h-[200px] flex-1">
          {hasSales ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sales-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={CHART_GRID} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: CHART_INK, fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis width={44} tickLine={false} axisLine={false} tick={{ fill: CHART_INK, fontSize: 11 }} tickFormatter={compactKES} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={chartLabelStyle}
                  cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4 }}
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
                  activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2, fill: "var(--chart-1)" }}
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
              No unit sales recorded in the last 12 months yet.
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
          <Link href="/leads" className="group rounded-lg">
            <p className="text-xs text-muted-foreground">Pipeline value</p>
            <p className="font-semibold tabular-nums group-hover:text-primary">{formatKES(pipelineValue)}</p>
          </Link>
          <Link href="/leads" className="group rounded-lg">
            <p className="text-xs text-muted-foreground">Total leads</p>
            <p className="font-semibold tabular-nums group-hover:text-primary">{totalLeads.toLocaleString("en-US")}</p>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
