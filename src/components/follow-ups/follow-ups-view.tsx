"use client";

import { useIsAdmin } from "@/components/providers/profile-provider";
import { useRealtimeLeadsRefresh } from "@/hooks/use-realtime-leads-refresh";
import { FollowUpSection } from "@/components/follow-ups/follow-up-section";
import { FOLLOW_UP_ALERT_COLORS } from "@/lib/leads";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function FollowUpsView({
  overdue,
  dueToday,
  upcoming,
}: {
  overdue: LeadWithRelations[];
  dueToday: LeadWithRelations[];
  upcoming: LeadWithRelations[];
}) {
  const isAdmin = useIsAdmin();
  useRealtimeLeadsRefresh();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Follow-ups</h1>
        <p className="text-sm text-muted-foreground">
          Every open lead with a follow-up due now or in the next 7 days.
        </p>
      </div>

      <FollowUpSection
        title="Overdue"
        color={FOLLOW_UP_ALERT_COLORS.Overdue}
        emptyMessage="No overdue follow-ups. Nice work."
        leads={overdue}
        isAdmin={isAdmin}
      />
      <FollowUpSection
        title="Due today"
        color={FOLLOW_UP_ALERT_COLORS["Due Soon"]}
        emptyMessage="Nothing due today."
        leads={dueToday}
        isAdmin={isAdmin}
      />
      <FollowUpSection
        title="Upcoming (next 7 days)"
        color={FOLLOW_UP_ALERT_COLORS["On Track"]}
        emptyMessage="Nothing on the horizon this week."
        leads={upcoming}
        isAdmin={isAdmin}
      />
    </div>
  );
}
