"use client";

import { ColorBadge } from "@/components/badges/color-badge";
import type { LeadStatus } from "@/lib/constants";
import { useStatusColor, useStatusLabels } from "@/components/providers/status-labels-provider";

export function StatusBadge({ status }: { status: LeadStatus }) {
  const labels = useStatusLabels();
  const color = useStatusColor(status);
  return <ColorBadge label={labels[status] ?? status} color={color} />;
}
