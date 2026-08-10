import { LOST_STATUS_KEY } from "@/lib/constants";
import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

export type LostBreakdownRow = { name: string; count: number; percentOfTotal: number };

export type LostLeadRow = {
  id: string;
  name: string;
  reason: string;
  note: string;
  source: string;
  project: string;
  managerName: string;
};

export type LostLeadsReport = {
  totalLost: number;
  withReasonCount: number;
  byReason: LostBreakdownRow[];
  bySource: LostBreakdownRow[];
  byProject: LostBreakdownRow[];
  byManager: LostBreakdownRow[];
  rows: LostLeadRow[];
};

function breakdown(lost: LeadWithRelations[], keyOf: (lead: LeadWithRelations) => string): LostBreakdownRow[] {
  const map = new Map<string, number>();
  for (const lead of lost) {
    const key = keyOf(lead);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const total = lost.length;
  return [...map.entries()]
    .map(([name, count]) => ({ name, count, percentOfTotal: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Turns closed-lost leads into patterns — why deals are lost, and whether
 * that clusters around a particular source, project, or sales manager.
 * Leads lost before the reason field existed just won't have one; they
 * still count toward totals but not the by-reason breakdown.
 */
export function computeLostLeadsReport(leads: LeadWithRelations[]): LostLeadsReport {
  const lost = leads.filter((l) => l.status === LOST_STATUS_KEY);
  const withReason = lost.filter((l) => l.lost_reason);

  return {
    totalLost: lost.length,
    withReasonCount: withReason.length,
    byReason: breakdown(withReason, (l) => l.lost_reason ?? "Unknown"),
    bySource: breakdown(lost, (l) => l.lead_source?.name ?? "Unknown"),
    byProject: breakdown(lost, (l) => l.property_type?.name ?? "Unassigned"),
    byManager: breakdown(lost, (l) => l.assigned_agent?.name ?? "Unassigned"),
    rows: lost.map((l) => ({
      id: l.id,
      name: fullName(l),
      reason: l.lost_reason ?? "—",
      note: l.lost_reason_note ?? "",
      source: l.lead_source?.name ?? "—",
      project: l.property_type?.name ?? "—",
      managerName: l.assigned_agent?.name ?? "Unassigned",
    })),
  };
}
