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
import { LEAD_STATUSES, type LeadStatus } from "@/lib/constants";
import { fullName } from "@/lib/format";
import { KanbanColumn } from "@/components/leads/kanban/kanban-column";
import { KanbanCard } from "@/components/leads/kanban/kanban-card";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function LeadsKanban({
  leads,
  isAdmin,
}: {
  leads: LeadWithRelations[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const profile = useProfile();
  const [overrides, setOverrides] = useState<Record<string, LeadStatus>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const leadsByStatus = useMemo(() => {
    const map = new Map<LeadStatus, LeadWithRelations[]>(
      LEAD_STATUSES.map((s) => [s, []])
    );
    for (const lead of leads) {
      const status = overrides[lead.id] ?? lead.status;
      map.get(status)?.push(lead);
    }
    return map;
  }, [leads, overrides]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : undefined;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !isAdmin) return;

    const leadId = String(active.id);
    const newStatus = over.id as LeadStatus;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    const previousStatus = lead.status;
    setOverrides((prev) => ({ ...prev, [leadId]: newStatus }));

    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", leadId);

    if (error) {
      setOverrides((prev) => ({ ...prev, [leadId]: previousStatus }));
      toast.error("Failed to update status", { description: error.message });
      return;
    }

    await supabase.from("activities").insert({
      lead_id: leadId,
      type: "status_change",
      body: `Status changed from ${previousStatus} to ${newStatus}.`,
      created_by: profile?.id ?? null,
    });

    toast.success(`${fullName(lead)} moved to ${newStatus}`);
    router.refresh();
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4">
        {LEAD_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            leads={leadsByStatus.get(status) ?? []}
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
    </DndContext>
  );
}
