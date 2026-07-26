"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_GOLD, CHART_GRID, CHART_INK, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import { EmptyChartState } from "@/components/dashboard/empty-chart-state";

export function LeadsOverTimeChart({
  data,
}: {
  data: { label: string; count: number }[];
}) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card className="rounded-2xl lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Leads over time (last 12 weeks)
        </CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -16, right: 8 }}>
              <defs>
                <linearGradient id="leadsOverTimeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={CHART_GOLD} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={CHART_GOLD} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={CHART_GRID} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART_INK, fontSize: 11 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fill: CHART_INK, fontSize: 12 }} allowDecimals={false} width={32} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Area
                type="monotone"
                dataKey="count"
                stroke={CHART_GOLD}
                strokeWidth={2}
                fill="url(#leadsOverTimeFill)"
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
  );
}
