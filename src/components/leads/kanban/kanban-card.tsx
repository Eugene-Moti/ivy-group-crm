"use client";

import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { FollowUpAlertBadge } from "@/components/badges/follow-up-alert-badge";
import { QuickContactActions } from "@/components/leads/quick-contact-actions";
import { formatBudgetRange, formatDate, fullName } from "@/lib/format";
import { getFollowUpAlert } from "@/lib/leads";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function KanbanCard({
  lead,
  isAdmin,
}: {
  lead: LeadWithRelations;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    disabled: !isAdmin,
  });

  const alert = getFollowUpAlert(lead.next_follow_up_at, lead.status);

  return (
    <div
      ref={setNodeRef}
      {...(isAdmin ? { ...attributes, ...listeners } : {})}
      onClick={() => {
        if (!isDragging) router.push(`/leads/${lead.id}`);
      }}
      style={
        transform
          ? {
              transform: `translate(${transform.x}px, ${transform.y}px)${isDragging ? " scale(1.03)" : ""}`,
            }
          : undefined
      }
      className={cn(
        "space-y-2 rounded-xl border border-border bg-card p-3 shadow-sm transition-[box-shadow,opacity] duration-150 hover:shadow-md",
        isAdmin && "cursor-grab active:cursor-grabbing",
        isDragging && "z-10 opacity-40 shadow-lg"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{fullName(lead)}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {lead.lead_type === "Real Estate Agent" && (
            <Badge variant="outline" className="border-gold/40 text-gold">
              Agent
            </Badge>
          )}
          <PriorityBadge priority={lead.priority} />
        </div>
      </div>

      {lead.preferred_area && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" />
          {lead.preferred_area}
        </div>
      )}

      <div className="text-sm font-medium">
        {formatBudgetRange(lead.budget_min, lead.budget_max)}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            {formatDate(lead.next_follow_up_at)}
          </span>
          <FollowUpAlertBadge alert={alert} />
        </div>
        <div onPointerDown={(e) => e.stopPropagation()}>
          <QuickContactActions phone={lead.phone} email={lead.email} />
        </div>
      </div>
    </div>
  );
}
