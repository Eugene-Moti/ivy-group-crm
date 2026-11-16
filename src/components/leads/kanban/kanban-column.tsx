"use client";

import { useDroppable } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { hexToRgba } from "@/lib/color";
import { WON_STATUS_KEY, type LeadStatus } from "@/lib/constants";
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
  const isWon = status === WON_STATUS_KEY;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "orion-glass flex w-72 shrink-0 flex-col rounded-2xl transition-[box-shadow,background-color,transform] duration-300 ease-[var(--ease-orion)]",
        isOver && "-translate-y-0.5"
      )}
      style={
        isOver
          ? {
              // The column lights up under the card in its own stage colour (gold for Won).
              boxShadow: `inset 0 0 0 2px ${isWon ? "var(--gold)" : color}, 0 20px 40px -24px ${isWon ? "var(--gold)" : color}`,
              backgroundColor: hexToRgba(isWon ? "#dcaa45" : color, 0.08),
            }
          : undefined
      }
    >
      <div
        className="flex items-center justify-between gap-2 rounded-t-2xl border-b border-[var(--glass-border)] px-3 py-2.5"
        style={{ borderTop: `2px solid ${color}` }}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className="size-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
          {labels[status]}
        </span>
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
        <AnimatePresence initial={false}>
          {leads.map((lead) => (
            <motion.div
              key={lead.id}
              layout
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", stiffness: 500, damping: 40 }}
            >
              <KanbanCard lead={lead} isAdmin={isAdmin} />
            </motion.div>
          ))}
        </AnimatePresence>
        {leads.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 py-6 text-center text-xs text-muted-foreground">
            No leads
          </div>
        )}
      </div>
    </div>
  );
}
