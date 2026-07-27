"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STATUS_COLORS, type LeadStatus } from "@/lib/constants";
import { CHART_GRID, CHART_INK, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import { EmptyChartState } from "@/components/dashboard/empty-chart-state";
import { useStatusLabels } from "@/components/providers/status-labels-provider";

export function PipelineByStatusChart({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  const statusLabels = useStatusLabels();
  const formatStatus = (value: string) => statusLabels[value as LeadStatus] ?? value;
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Pipeline by status
        </CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid horizontal={false} stroke={CHART_GRID} />
              <XAxis type="number" tick={{ fill: CHART_INK, fontSize: 12 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="status"
                width={110}
                tick={{ fill: CHART_INK, fontSize: 11 }}
                tickFormatter={formatStatus}
              />
              <Tooltip
                cursor={{ fill: "var(--accent)" }}
                contentStyle={chartTooltipStyle}
                labelFormatter={(label) => formatStatus(String(label))}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {data.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyChartState message="No leads yet." />
        )}
      </CardContent>
    </Card>
  );
}
