"use client";

import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { hexToRgba } from "@/lib/color";
import type { LeadStatus } from "@/lib/constants";
import { useStatusColor, useStatusLabels } from "@/components/providers/status-labels-provider";
import { KanbanCard } from "@/components/leads/kanban/kanban-card";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function KanbanColumn({
  status,
  leads,
  isAdmin,
}: {
  status: LeadStatus;
  leads: LeadWithRelations[];
  isAdmin: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const labels = useStatusLabels();
  const color = useStatusColor(status);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-card/40 transition-colors",
        isOver && "border-gold/60 bg-gold/5"
      )}
    >
      <div
        className="flex items-center justify-between gap-2 rounded-t-xl border-b border-border px-3 py-2.5"
        style={{ borderTop: `2px solid ${color}` }}
      >
        <span className="text-sm font-medium">{labels[status]}</span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-medium"
          style={{ backgroundColor: hexToRgba(color, 0.15), color }}
        >
          {leads.length}
        </span>
      </div>
      <div
        className="max-h-[70vh] flex-1 space-y-2 overflow-y-auto p-2"
        style={{ minHeight: 120 }}
      >
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} isAdmin={isAdmin} />
        ))}
        {leads.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">
            No leads
          </div>
        )}
      </div>
    </div>
  );
}
