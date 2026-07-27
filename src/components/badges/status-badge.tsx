"use client";

import { ColorBadge } from "@/components/badges/color-badge";
import { STATUS_COLORS, type LeadStatus } from "@/lib/constants";
import { useStatusLabels } from "@/components/providers/status-labels-provider";

export function StatusBadge({ status }: { status: LeadStatus }) {
  const labels = useStatusLabels();
  return <ColorBadge label={labels[status]} color={STATUS_COLORS[status]} />;
}
