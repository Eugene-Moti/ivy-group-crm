"use client";

import { useRouter } from "next/navigation";
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
import { CHART_GRID, CHART_INK, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import { EmptyChartState } from "@/components/dashboard/empty-chart-state";
import { usePipelineStages, useStatusLabels } from "@/components/providers/status-labels-provider";

export function PipelineByStatusChart({
  data,
}: {
  data: { status: string; count: number }[];
}) {
  const router = useRouter();
  const statusLabels = useStatusLabels();
  const stages = usePipelineStages();
  const colorOf = (status: string) => stages.find((s) => s.key === status)?.color ?? "#7A8B84";
  const formatStatus = (value: string) => statusLabels[value] ?? value;
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
              <Bar
                dataKey="count"
                radius={[0, 4, 4, 0]}
                maxBarSize={18}
                cursor="pointer"
                onClick={(entry: unknown) => {
                  const status = (entry as { payload?: { status: string } }).payload?.status;
                  if (status) router.push(`/leads?status=${encodeURIComponent(status)}`);
                }}
              >
                {data.map((entry) => (
                  <Cell key={entry.status} fill={colorOf(entry.status)} />
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
