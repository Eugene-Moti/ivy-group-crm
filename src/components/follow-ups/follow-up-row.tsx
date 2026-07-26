"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { QuickContactActions } from "@/components/leads/quick-contact-actions";
import { RescheduleFollowUpPopover } from "@/components/leads/reschedule-follow-up-popover";
import { QuickLogContactMenu } from "@/components/follow-ups/quick-log-contact-menu";
import { formatDateTime, fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function FollowUpRow({
  lead,
  isAdmin,
}: {
  lead: LeadWithRelations;
  isAdmin: boolean;
}) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/leads/${lead.id}`)}
      className="flex cursor-pointer flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-ring/50 sm:flex-nowrap"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium hover:text-gold hover:underline">
            {fullName(lead)}
          </span>
          <PriorityBadge priority={lead.priority} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {lead.preferred_area && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {lead.preferred_area}
            </span>
          )}
          <span>{lead.assigned_agent?.name ?? "Unassigned"}</span>
          <span>Due {formatDateTime(lead.next_follow_up_at)}</span>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <QuickContactActions phone={lead.phone} email={lead.email} />
        {isAdmin && (
          <>
            <RescheduleFollowUpPopover
              leadId={lead.id}
              status={lead.status}
              nextFollowUpAt={lead.next_follow_up_at}
            />
            <QuickLogContactMenu leadId={lead.id} />
          </>
        )}
      </div>
    </div>
  );
}
