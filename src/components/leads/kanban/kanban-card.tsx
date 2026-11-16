"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import { ArrowRight, MapPin, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { FollowUpAlertBadge } from "@/components/badges/follow-up-alert-badge";
import { QuickContactActions } from "@/components/leads/quick-contact-actions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatBudgetRange, formatDate, fullName } from "@/lib/format";
import { getFollowUpAlert } from "@/lib/leads";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { LeadStatus } from "@/lib/constants";

export function KanbanCard({
  lead,
  isAdmin,
  nextStage = null,
  nextStageLabel,
  onNextStage,
}: {
  lead: LeadWithRelations;
  isAdmin: boolean;
  /** Where "Next stage →" moves this card; null hides the button. */
  nextStage?: LeadStatus | null;
  nextStageLabel?: string;
  onNextStage?: (next: LeadStatus) => void;
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
      data-lead-card={lead.id}
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
        "space-y-2 rounded-xl border border-border bg-card/90 p-3 shadow-sm backdrop-blur transition-[box-shadow,opacity,transform,border-color] duration-200 ease-[var(--ease-orion)] hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-[0_14px_28px_-18px_rgb(0_0_0/0.45)]",
        isAdmin && "cursor-grab active:cursor-grabbing",
        isDragging && "z-10 border-dashed opacity-35 shadow-none hover:translate-y-0"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/leads/${lead.id}`}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          className="rounded-sm text-sm font-medium hover:underline focus-visible:outline-2 focus-visible:outline-gold"
        >
          {fullName(lead)}
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          {lead.lead_type === "Real Estate Agent" && (
            <Badge variant="outline" className="border-gold/40 text-gold">
              Agent
            </Badge>
          )}
          {lead.repeat_of && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  onPointerDown={(e) => e.stopPropagation()}
                  className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold"
                >
                  <RefreshCw className="size-3" />
                </span>
              </TooltipTrigger>
              <TooltipContent>Repeat client — first bought as {fullName(lead.repeat_of)}</TooltipContent>
            </Tooltip>
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

      {nextStage && onNextStage && (
        <div className="flex justify-end border-t border-border/50 pt-2">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onNextStage(nextStage);
            }}
            aria-label={`Move ${fullName(lead)} to ${nextStageLabel ?? "the next stage"}`}
            className="group/next flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-gold dark:text-evergreen-soft"
          >
            {nextStageLabel ? `Next: ${nextStageLabel}` : "Next stage"}
            <ArrowRight className="size-3.5 transition-transform duration-300 ease-[var(--ease-orion-spring)] group-hover/next:translate-x-0.5" />
          </button>
        </div>
      )}
    </div>
  );
}
