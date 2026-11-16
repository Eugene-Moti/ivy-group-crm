"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { usePipelineStages, useStatusLabels } from "@/components/providers/status-labels-provider";
import {
  LOST_STATUS_KEY,
  REFERRED_CLIENT_ACTIVE_STATUS_KEY,
  REFERRED_DEAL_DONE_STATUS_KEY,
  WON_STATUS_KEY,
  type LeadStatus,
} from "@/lib/constants";
import { fullName } from "@/lib/format";
import { celebrateWon } from "@/lib/celebrate";
import { KanbanColumn } from "@/components/leads/kanban/kanban-column";
import { KanbanCard } from "@/components/leads/kanban/kanban-card";
import { LostReasonDialog } from "@/components/leads/lost-reason-dialog";
import { RecordUnitSaleDialog } from "@/components/leads/record-unit-sale-dialog";
import { Input } from "@/components/ui/input";
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

/**
 * Keyboard dragging: Space/Enter picks a card up, Left/Right jumps it a
 * whole column at a time (not 25px nudges), Space/Enter drops it, Escape
 * cancels. Columns are found by their on-screen order.
 */
const columnCoordinates: KeyboardCoordinateGetter = (event, { context }) => {
  const { collisionRect, droppableRects, droppableContainers } = context;
  const dir = event.code === "ArrowRight" ? 1 : event.code === "ArrowLeft" ? -1 : 0;
  if (!collisionRect || dir === 0) return undefined;
  event.preventDefault();
  const columns = droppableContainers
    .getEnabled()
    .map((c) => droppableRects.get(c.id))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .sort((a, b) => a.left - b.left);
  const centre = collisionRect.left + collisionRect.width / 2;
  const target =
    dir > 0 ? columns.find((r) => r.left > centre) : [...columns].reverse().find((r) => r.left + r.width < centre);
  if (!target) return undefined;
  return { x: target.left + (target.width - collisionRect.width) / 2, y: target.top + 48 };
};

/** Stages "Next stage" can step through: the main deal journey, never Lost or the agent-only stages. */
const SKIPPED_BY_NEXT = new Set<string>([LOST_STATUS_KEY, REFERRED_CLIENT_ACTIVE_STATUS_KEY, REFERRED_DEAL_DONE_STATUS_KEY]);

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
  const [pendingUnitSaleLead, setPendingUnitSaleLead] = useState<LeadWithRelations | null>(null);
  const [search, setSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates })
  );

  const leadName = (id: string | number) => {
    const lead = leads.find((l) => l.id === String(id));
    return lead ? fullName(lead) : "Lead";
  };
  const stageName = (id: string | number | undefined) => (id === undefined ? "" : statusLabels[String(id)] ?? String(id));

  // What a screen reader hears while a card is moved.
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${leadName(active.id)}. Use the left and right arrow keys to choose a stage, then press space to drop it, or escape to cancel.`,
    onDragOver: ({ active, over }) => (over ? `${leadName(active.id)} is over ${stageName(over.id)}.` : `${leadName(active.id)} is not over a stage.`),
    onDragEnd: ({ active, over }) => (over ? `${leadName(active.id)} dropped in ${stageName(over.id)}.` : `${leadName(active.id)} dropped. Nothing changed.`),
    onDragCancel: ({ active }) => `Moving ${leadName(active.id)} was cancelled. Nothing changed.`,
  };

  /** The stage "Next stage →" moves a card to, or null where there is no sensible next step. */
  function nextStageFor(lead: LeadWithRelations): LeadStatus | null {
    const status = overrides[lead.id] ?? lead.status;
    if (status === WON_STATUS_KEY || SKIPPED_BY_NEXT.has(status)) return null;
    const journey = stages.filter((s) => !SKIPPED_BY_NEXT.has(s.key));
    const i = journey.findIndex((s) => s.key === status);
    const next = i >= 0 ? journey[i + 1]?.key : undefined;
    if (!next) return null;
    if (next === WON_STATUS_KEY && lead.lead_type === "Real Estate Agent") return null;
    return next;
  }

  const normalizedSearch = search.trim().toLowerCase();
  const visibleLeads = useMemo(() => {
    if (!normalizedSearch) return leads;
    return leads.filter((l) => {
      const haystack = [fullName(l), l.phone, l.email].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [leads, normalizedSearch]);

  const leadsByStatus = useMemo(() => {
    const map = new Map<LeadStatus, LeadWithRelations[]>(
      stages.map((s) => [s.key, []])
    );
    for (const lead of visibleLeads) {
      const status = overrides[lead.id] ?? lead.status;
      map.get(status)?.push(lead);
    }
    return map;
  }, [visibleLeads, overrides, stages]);

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
    // A card already moved with "Next stage" may not have refreshed yet.
    const previousStatus = overrides[leadId] ?? lead.status;
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
    if (newStatus === WON_STATUS_KEY) {
      // The card is already in the Won column (optimistic override), so the
      // burst comes from where it landed.
      requestAnimationFrame(() =>
        celebrateWon(document.querySelector(`[data-lead-card="${leadId}"]`))
      );
      if (lead.lead_type === "Direct Client") setPendingUnitSaleLead(lead);
    }
    router.refresh();
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !isAdmin) return;

    const lead = leads.find((l) => l.id === String(active.id));
    if (lead) await moveLead(lead, over.id as LeadStatus);
  }

  /** Shared by drag-and-drop and the "Next stage" button, so both follow the same rules. */
  async function moveLead(lead: LeadWithRelations, newStatus: LeadStatus) {
    if ((overrides[lead.id] ?? lead.status) === newStatus) return;

    if (newStatus === WON_STATUS_KEY && lead.lead_type === "Real Estate Agent") {
      toast.error("Agents can't be marked Won", {
        description: `${fullName(lead)} is a referral source, not the client — use "Add client details" on their lead page to convert this into a client deal first.`,
      });
      return;
    }

    if (newStatus === LOST_STATUS_KEY) {
      // Card stays put — nothing is optimistically moved — until a reason is confirmed.
      setPendingLostDrag(lead);
      return;
    }

    await commitStatusChange(lead, newStatus);
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cards by name, phone, or email…"
          className="pl-8"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      {normalizedSearch && (
        <p className="text-xs text-muted-foreground">
          {visibleLeads.length === 0
            ? "No cards match."
            : `${visibleLeads.length} card${visibleLeads.length === 1 ? "" : "s"} match across all columns.`}
        </p>
      )}

      {isAdmin && (
        <p className="text-xs text-muted-foreground">
          Drag a card to another stage, or use <span className="font-medium text-foreground">Next stage →</span>. With a keyboard, focus a card, press Space, then use the arrow keys.
        </p>
      )}

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable: "To move this lead to another stage, press space or enter. Use the left and right arrow keys to choose a stage, then press space or enter again to drop it. Press escape to cancel.",
          },
        }}
      >
        <div className="flex gap-3 overflow-x-auto pb-4" onWheel={handleWheel}>
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.key}
              status={stage.key}
              leads={leadsByStatus.get(stage.key) ?? []}
              isAdmin={isAdmin}
              nextStageFor={nextStageFor}
              onNextStage={(lead, next) => moveLead(lead, next)}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 320, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }}>
          {activeLead ? (
            // Picked up: the card lifts and tilts with a spring, like the brand board demo.
            <motion.div
              initial={{ rotate: 0, scale: 1 }}
              animate={{ rotate: 3, scale: 1.05 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="w-72 cursor-grabbing rounded-xl shadow-[0_28px_50px_-18px_rgb(0_0_0/0.45)] ring-1 ring-gold/40"
            >
              <KanbanCard lead={activeLead} isAdmin={false} />
            </motion.div>
          ) : null}
        </DragOverlay>

        {pendingLostDrag && (
          <LostReasonDialog
            open={!!pendingLostDrag}
            onOpenChange={(open) => !open && setPendingLostDrag(null)}
            leadName={fullName(pendingLostDrag)}
            leadType={pendingLostDrag.lead_type}
            onConfirm={async (reason, note) => {
              await commitStatusChange(pendingLostDrag, LOST_STATUS_KEY, { reason, note });
              setPendingLostDrag(null);
            }}
          />
        )}

        {pendingUnitSaleLead && (
          <RecordUnitSaleDialog
            open={!!pendingUnitSaleLead}
            onOpenChange={(open) => !open && setPendingUnitSaleLead(null)}
            leads={[pendingUnitSaleLead]}
            lockedLead={pendingUnitSaleLead}
            onSaved={() => setPendingUnitSaleLead(null)}
          />
        )}
      </DndContext>
    </div>
  );
}
