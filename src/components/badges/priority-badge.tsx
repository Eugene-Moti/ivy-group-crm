import { ColorBadge } from "@/components/badges/color-badge";
import { PRIORITY_COLORS, type LeadPriority } from "@/lib/constants";

export function PriorityBadge({ priority }: { priority: LeadPriority }) {
  return <ColorBadge label={priority} color={PRIORITY_COLORS[priority]} />;
}
