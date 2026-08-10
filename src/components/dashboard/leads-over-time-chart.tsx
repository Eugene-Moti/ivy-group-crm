"use client";

import { useMemo, useState } from "react";
import {
  differenceInCalendarDays,
  format,
  isBefore,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CHART_GOLD, CHART_GRID, CHART_INK, chartTooltipStyle } from "@/components/dashboard/chart-theme";
import { EmptyChartState } from "@/components/dashboard/empty-chart-state";

type Granularity = "week" | "month";
const BUCKET_COUNT = 12;
const MONTHLY_SWITCH_THRESHOLD_DAYS = 70;

function bucketLeads(
  createdDates: string[],
  granularity: Granularity,
  now: Date
): { label: string; count: number }[] {
  const bucketStart =
    granularity === "week"
      ? (n: number) => startOfWeek(subWeeks(now, n), { weekStartsOn: 1 })
      : (n: number) => startOfMonth(subMonths(now, n));
  const labelFormat = granularity === "week" ? "d MMM" : "MMM yyyy";

  const buckets = Array.from({ length: BUCKET_COUNT }, (_, i) => {
    const start = bucketStart(BUCKET_COUNT - 1 - i);
    return { start, label: format(start, labelFormat), count: 0 };
  });

  for (const createdAt of createdDates) {
    const date = new Date(createdAt);
    for (let i = buckets.length - 1; i >= 0; i--) {
      if (!isBefore(date, buckets[i].start)) {
        buckets[i].count += 1;
        break;
      }
    }
  }

  return buckets.map((b) => ({ label: b.label, count: b.count }));
}

/** Monthly if the data spans more than ~10 weeks, otherwise weekly — the admin can always override. */
function autoGranularity(createdDates: string[], now: Date): Granularity {
  if (createdDates.length === 0) return "week";
  const earliest = createdDates.reduce(
    (min, d) => (new Date(d) < min ? new Date(d) : min),
    new Date(createdDates[0])
  );
  return differenceInCalendarDays(now, earliest) > MONTHLY_SWITCH_THRESHOLD_DAYS ? "month" : "week";
}

export function LeadsOverTimeChart({ createdDates }: { createdDates: string[] }) {
  const now = useMemo(() => new Date(), []);
  const [granularity, setGranularity] = useState<Granularity>(() => autoGranularity(createdDates, now));

  const data = useMemo(
    () => bucketLeads(createdDates, granularity, now),
    [createdDates, granularity, now]
  );
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card className="rounded-2xl lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Leads over time (last {BUCKET_COUNT} {granularity === "week" ? "weeks" : "months"})
        </CardTitle>
        <Select value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Weekly</SelectItem>
            <SelectItem value="month">Monthly</SelectItem>
          </SelectContent>
        </Select>
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
