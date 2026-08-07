"use client";

import { useRouter } from "next/navigation";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PRIORITY_COLORS } from "@/lib/constants";
import { chartTooltipStyle } from "@/components/dashboard/chart-theme";
import { EmptyChartState } from "@/components/dashboard/empty-chart-state";

export function PrioritySplitChart({
  data,
}: {
  data: { priority: string; count: number }[];
}) {
  const router = useRouter();
  const total = data.reduce((sum, d) => sum + d.count, 0);

  function goToPriority(priority: string) {
    router.push(`/leads?priority=${encodeURIComponent(priority)}`);
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Priority split
        </CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {total > 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <ResponsiveContainer width="100%" height="75%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="priority"
                  innerRadius="60%"
                  outerRadius="90%"
                  paddingAngle={2}
                  strokeWidth={0}
                  cursor="pointer"
                  onClick={(entry: unknown) => {
                    const priority = (entry as { payload?: { priority: string } }).payload
                      ?.priority;
                    if (priority) goToPriority(priority);
                  }}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.priority}
                      fill={PRIORITY_COLORS[entry.priority as keyof typeof PRIORITY_COLORS]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
              {data.map((entry) => (
                <button
                  key={entry.priority}
                  type="button"
                  onClick={() => goToPriority(entry.priority)}
                  className="flex items-center gap-1.5 text-xs hover:underline"
                >
                  <span
                    className="size-2 rounded-full"
                    style={{
                      backgroundColor:
                        PRIORITY_COLORS[entry.priority as keyof typeof PRIORITY_COLORS],
                    }}
                  />
                  <span className="text-muted-foreground">
                    {entry.priority} ({entry.count})
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <EmptyChartState message="No leads yet." />
        )}
      </CardContent>
    </Card>
  );
}
