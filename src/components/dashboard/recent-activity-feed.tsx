"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyChartState } from "@/components/dashboard/empty-chart-state";
import { ACTIVITY_TYPE_META } from "@/lib/activity";
import { formatDateTime, formatRelative, fullName } from "@/lib/format";
import { hexToRgba } from "@/lib/color";
import type { ActivityWithLeadAndAuthor } from "@/lib/queries/activities";

export function RecentActivityFeed({
  activities,
}: {
  activities: ActivityWithLeadAndAuthor[];
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent className="h-96 overflow-y-auto">
        {activities.length ? (
          <ol className="space-y-4">
            <AnimatePresence initial={false}>
            {activities.map((activity) => {
              const meta = ACTIVITY_TYPE_META[activity.type];
              const Icon = meta.icon;
              return (
                <motion.li
                  key={activity.id}
                  layout
                  initial={{ opacity: 0, x: -12, backgroundColor: "rgba(201, 165, 74, 0.12)" }}
                  animate={{ opacity: 1, x: 0, backgroundColor: "rgba(201, 165, 74, 0)" }}
                  transition={{
                    opacity: { duration: 0.3 },
                    x: { type: "spring", stiffness: 400, damping: 35 },
                    backgroundColor: { duration: 1.6, ease: "easeOut" },
                  }}
                  className="flex gap-3 rounded-lg"
                >
                  <div
                    className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: hexToRgba(meta.color, 0.15), color: meta.color }}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      {activity.lead ? (
                        <Link
                          href={`/leads/${activity.lead.id}`}
                          className="text-sm font-medium hover:text-gold hover:underline"
                        >
                          {fullName(activity.lead)}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium">Unknown lead</span>
                      )}
                      <span
                        className="text-xs text-muted-foreground"
                        title={formatDateTime(activity.created_at)}
                      >
                        {formatRelative(activity.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {meta.label}
                      {activity.body ? ` — ${activity.body}` : ""}
                    </p>
                  </div>
                </motion.li>
              );
            })}
            </AnimatePresence>
          </ol>
        ) : (
          <EmptyChartState message="No activity yet." />
        )}
      </CardContent>
    </Card>
  );
}
