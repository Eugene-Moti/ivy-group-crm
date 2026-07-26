import { ColorBadge } from "@/components/badges/color-badge";
import { FOLLOW_UP_ALERT_COLORS, type FollowUpAlert } from "@/lib/leads";

export function FollowUpAlertBadge({ alert }: { alert: FollowUpAlert }) {
  if (alert === "None") {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  return <ColorBadge label={alert} color={FOLLOW_UP_ALERT_COLORS[alert]} />;
}
