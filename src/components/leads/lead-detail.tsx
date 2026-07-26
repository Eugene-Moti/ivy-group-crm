"use client";

import { useState } from "react";
import { useIsAdmin } from "@/components/providers/profile-provider";
import { LeadDetailHeader } from "@/components/leads/lead-detail-header";
import { LeadProfileView } from "@/components/leads/lead-profile-view";
import { LeadProfileEditor } from "@/components/leads/lead-profile-editor";
import { AddActivityForm } from "@/components/leads/add-activity-form";
import { ActivityTimeline } from "@/components/leads/activity-timeline";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { ActivityWithAuthor } from "@/lib/queries/activities";

type LeadOption = { id: string; name: string };
type AgentOption = { id: string; name: string; phone: string | null; email: string | null };

export function LeadDetail({
  lead,
  activities,
  leadSources,
  propertyTypes,
  agents,
}: {
  lead: LeadWithRelations;
  activities: ActivityWithAuthor[];
  leadSources: LeadOption[];
  propertyTypes: LeadOption[];
  agents: AgentOption[];
}) {
  const isAdmin = useIsAdmin();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="space-y-6">
      <LeadDetailHeader
        lead={lead}
        isAdmin={isAdmin}
        isEditing={isEditing}
        onToggleEdit={() => setIsEditing((v) => !v)}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        <div>
          {isEditing ? (
            <LeadProfileEditor
              lead={lead}
              leadSources={leadSources}
              propertyTypes={propertyTypes}
              agents={agents}
              onDone={() => setIsEditing(false)}
            />
          ) : (
            <LeadProfileView lead={lead} isAdmin={isAdmin} />
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
            Communication timeline
          </h2>
          {isAdmin && <AddActivityForm leadId={lead.id} />}
          <ActivityTimeline activities={activities} />
        </div>
      </div>
    </div>
  );
}
