"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CHART_GOLD, CHART_GRID, CHART_INK, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import { EmptyChartState } from "@/components/dashboard/empty-chart-state";

export function LeadsBySourceChart({
  data,
}: {
  data: { name: string; count: number }[];
}) {
  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Leads by source
        </CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {sorted.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} stroke={CHART_GRID} />
              <XAxis type="number" tick={{ fill: CHART_INK, fontSize: 12 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={100}
                tick={{ fill: CHART_INK, fontSize: 11 }}
              />
              <Tooltip cursor={{ fill: "var(--accent)" }} contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill={CHART_GOLD} radius={[0, 4, 4, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartState message="No leads yet." />
        )}
      </CardContent>
    </Card>
  );
}
