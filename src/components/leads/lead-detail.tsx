"use client";

import { useState } from "react";
import { useIsAdmin } from "@/components/providers/profile-provider";
import { LeadDetailHeader } from "@/components/leads/lead-detail-header";
import { LeadProfileView } from "@/components/leads/lead-profile-view";
import { LeadProfileEditor } from "@/components/leads/lead-profile-editor";
import { ReferredLeadsList } from "@/components/leads/referred-leads-list";
import { GenerateReferralReportButton } from "@/components/leads/generate-referral-report-button";
import { ConvertAgentToClientDialog } from "@/components/leads/convert-agent-to-client-dialog";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { AddActivityForm } from "@/components/leads/add-activity-form";
import { ActivityTimeline } from "@/components/leads/activity-timeline";
import { EvidenceUploadForm } from "@/components/leads/evidence-upload-form";
import { EvidenceTimeline } from "@/components/leads/evidence-timeline";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { ActivityWithAuthor } from "@/lib/queries/activities";
import type { LeadEvidenceWithAuthor } from "@/lib/queries/evidence";

type LeadOption = { id: string; name: string };
type ProjectOption = { id: string; name: string; location: string | null };
type AgentOption = { id: string; name: string; phone: string | null; email: string | null };
type AgentLeadOption = { id: string; first_name: string; last_name: string };

export function LeadDetail({
  lead,
  activities,
  leadSources,
  propertyTypes,
  agents,
  agentLeads,
  campaigns,
  referredLeads,
  evidence,
}: {
  lead: LeadWithRelations;
  activities: ActivityWithAuthor[];
  leadSources: LeadOption[];
  propertyTypes: ProjectOption[];
  agents: AgentOption[];
  agentLeads: AgentLeadOption[];
  campaigns: LeadOption[];
  referredLeads: LeadWithRelations[];
  evidence: LeadEvidenceWithAuthor[];
}) {
  const isAdmin = useIsAdmin();
  const [isEditing, setIsEditing] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  return (
    <div className="space-y-6">
      <LeadDetailHeader
        lead={lead}
        activities={activities}
        evidence={evidence}
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
              agentLeads={agentLeads}
              campaigns={campaigns}
              onDone={() => setIsEditing(false)}
            />
          ) : (
            <LeadProfileView lead={lead} isAdmin={isAdmin} />
          )}
          {lead.lead_type === "Real Estate Agent" && (
            <div className="mt-4 space-y-2">
              {isAdmin && (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setConvertOpen(true)}>
                    <UserPlus className="size-3.5" />
                    Add client details
                  </Button>
                  {referredLeads.length > 0 && (
                    <GenerateReferralReportButton agentLead={lead} referredLeads={referredLeads} />
                  )}
                </div>
              )}
              <ReferredLeadsList leads={referredLeads} />
            </div>
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

      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
            Client evidence
          </h2>
          <p className="text-sm text-muted-foreground">
            Dated notes and screenshots (WhatsApp, calls, email) proving contact with
            this client — useful if ownership of the lead is ever disputed.
          </p>
        </div>
        {isAdmin && (
          <EvidenceUploadForm leadId={lead.id} leadCreatedAt={lead.created_at} />
        )}
        <EvidenceTimeline evidence={evidence} isAdmin={isAdmin} />
      </div>

      {lead.lead_type === "Real Estate Agent" && (
        <ConvertAgentToClientDialog
          open={convertOpen}
          onOpenChange={setConvertOpen}
          agentLead={lead}
        />
      )}
    </div>
  );
}
