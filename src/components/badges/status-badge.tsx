import { ColorBadge } from "@/components/badges/color-badge";
import { STATUS_COLORS, type LeadStatus } from "@/lib/constants";

export function StatusBadge({ status }: { status: LeadStatus }) {
  return <ColorBadge label={status} color={STATUS_COLORS[status]} />;
}
