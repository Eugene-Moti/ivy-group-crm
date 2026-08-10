"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { usePipelineStages, useStatusLabels } from "@/components/providers/status-labels-provider";
import { LOST_STATUS_KEY, type LeadStatus } from "@/lib/constants";
import { fullName } from "@/lib/format";
import { KanbanColumn } from "@/components/leads/kanban/kanban-column";
import { KanbanCard } from "@/components/leads/kanban/kanban-card";
import { LostReasonDialog } from "@/components/leads/lost-reason-dialog";
import type { LeadWithRelations } from "@/lib/queries/leads";

/** Nearest ancestor (up to `boundary`) that can still scroll vertically. */
function findVerticalScrollable(el: HTMLElement, boundary: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el;
  while (node && node !== boundary) {
    const canScrollY =
      /(auto|scroll)/.test(getComputedStyle(node).overflowY) &&
      node.scrollHeight > node.clientHeight;
    if (canScrollY) return node;
    node = node.parentElement;
  }
  return null;
}

export function LeadsKanban({
  leads,
  isAdmin,
}: {
  leads: LeadWithRelations[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const profile = useProfile();
  const stages = usePipelineStages();
  const statusLabels = useStatusLabels();
  const [overrides, setOverrides] = useState<Record<string, LeadStatus>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingLostDrag, setPendingLostDrag] = useState<LeadWithRelations | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const leadsByStatus = useMemo(() => {
    const map = new Map<LeadStatus, LeadWithRelations[]>(
      stages.map((s) => [s.key, []])
    );
    for (const lead of leads) {
      const status = overrides[lead.id] ?? lead.status;
      map.get(status)?.push(lead);
    }
    return map;
  }, [leads, overrides, stages]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : undefined;

  /**
   * Lets a plain mouse wheel scroll the board sideways. Browsers only scroll
   * an overflow-x container natively from horizontal input (trackpad swipe,
   * shift+wheel) — a vertical wheel gesture does nothing to it by default.
   * Wheel events bubble regardless of what the browser scrolls, so we only
   * redirect to horizontal once the column under the cursor has no vertical
   * room left in that direction — otherwise its own card list scrolls
   * normally, same as if this handler weren't here.
   */
  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

    const scrollable = findVerticalScrollable(
      event.target as HTMLElement,
      event.currentTarget
    );
    if (scrollable) {
      const atTop = scrollable.scrollTop <= 0;
      const atBottom =
        scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight - 1;
      if ((event.deltaY < 0 && !atTop) || (event.deltaY > 0 && !atBottom)) {
        return;
      }
    }

    event.currentTarget.scrollLeft += event.deltaY;
    event.preventDefault();
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function commitStatusChange(
    lead: LeadWithRelations,
    newStatus: LeadStatus,
    lostReason?: { reason: string; note: string }
  ) {
    const leadId = lead.id;
    const previousStatus = lead.status;
    setOverrides((prev) => ({ ...prev, [leadId]: newStatus }));

    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({
        status: newStatus,
        lost_reason: lostReason?.reason ?? null,
        lost_reason_note: lostReason?.note || null,
      })
      .eq("id", leadId);

    if (error) {
      setOverrides((prev) => ({ ...prev, [leadId]: previousStatus }));
      toast.error("Failed to update status", { description: error.message });
      return;
    }

    await supabase.from("activities").insert({
      lead_id: leadId,
      type: "status_change",
      body: `Status changed from ${statusLabels[previousStatus] ?? previousStatus} to ${statusLabels[newStatus] ?? newStatus}.`,
      created_by: profile?.id ?? null,
    });

    toast.success(`${fullName(lead)} moved to ${statusLabels[newStatus] ?? newStatus}`);
    router.refresh();
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !isAdmin) return;

    const leadId = String(active.id);
    const newStatus = over.id as LeadStatus;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    if (newStatus === LOST_STATUS_KEY) {
      // Card stays put — nothing is optimistically moved — until a reason is confirmed.
      setPendingLostDrag(lead);
      return;
    }

    await commitStatusChange(lead, newStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4" onWheel={handleWheel}>
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.key}
            status={stage.key}
            leads={leadsByStatus.get(stage.key) ?? []}
            isAdmin={isAdmin}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead ? (
          <div className="w-72 rotate-2 opacity-90">
            <KanbanCard lead={activeLead} isAdmin={false} />
          </div>
        ) : null}
      </DragOverlay>

      {pendingLostDrag && (
        <LostReasonDialog
          open={!!pendingLostDrag}
          onOpenChange={(open) => !open && setPendingLostDrag(null)}
          leadName={fullName(pendingLostDrag)}
          onConfirm={async (reason, note) => {
            await commitStatusChange(pendingLostDrag, LOST_STATUS_KEY, { reason, note });
            setPendingLostDrag(null);
          }}
        />
      )}
    </DndContext>
  );
}
