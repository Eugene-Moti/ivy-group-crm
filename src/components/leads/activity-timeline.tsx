import { ACTIVITY_TYPE_META } from "@/lib/activity";
import { formatDateTime, formatRelative } from "@/lib/format";
import { hexToRgba } from "@/lib/color";
import type { ActivityWithAuthor } from "@/lib/queries/activities";

export function ActivityTimeline({
  activities,
}: {
  activities: ActivityWithAuthor[];
}) {
  if (!activities.length) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        No activity yet.
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {activities.map((activity) => {
        const meta = ACTIVITY_TYPE_META[activity.type];
        const Icon = meta.icon;
        return (
          <li key={activity.id} className="flex gap-3">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: hexToRgba(meta.color, 0.15),
                color: meta.color,
              }}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="text-sm font-medium">{meta.label}</span>
                <span
                  className="text-xs text-muted-foreground"
                  title={formatDateTime(activity.created_at)}
                >
                  {formatRelative(activity.created_at)}
                </span>
              </div>
              {activity.body && (
                <p className="mt-0.5 text-sm text-muted-foreground whitespace-pre-wrap">
                  {activity.body}
                </p>
              )}
              {activity.author?.full_name && (
                <p className="mt-1 text-xs text-muted-foreground/70">
                  by {activity.author.full_name}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
