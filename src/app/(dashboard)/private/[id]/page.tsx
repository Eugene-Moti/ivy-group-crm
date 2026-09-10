import { notFound } from "next/navigation";
import {
  getAgentLeads,
  getAgents,
  getLeadSources,
  getPropertyTypes,
} from "@/lib/queries/leads";
import { getActivities } from "@/lib/queries/activities";
import { getLeadEvidence } from "@/lib/queries/evidence";
import { getLeadDocuments } from "@/lib/queries/documents";
import { getCampaigns } from "@/lib/queries/settings";
import { getPrivateLead } from "@/lib/queries/private-leads";
import { requireUnlockedPrivate } from "@/lib/private/guard";
import { logPrivate } from "@/lib/private/audit";
import { LeadDetail } from "@/components/leads/lead-detail";
import { PrivateClientActions } from "@/components/private/private-client-actions";

async function safe<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    console.error(`Private client page: failed to load ${label}`, err);
    return fallback;
  }
}

export default async function PrivateClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile } = await requireUnlockedPrivate();

  const [lead, activities, leadSources, propertyTypes, agents, agentLeads, evidence, documents, campaigns] =
    await Promise.all([
      getPrivateLead(id),
      getActivities(id),
      getLeadSources(),
      getPropertyTypes(),
      getAgents(),
      getAgentLeads(),
      safe(getLeadEvidence(id), [], "evidence"),
      safe(getLeadDocuments(id), [], "documents"),
      getCampaigns(),
    ]);

  if (!lead) notFound();

  await logPrivate("view_client", { leadId: lead.id });

  return (
    <div className="space-y-4">
      <PrivateClientActions leadId={lead.id} isAdmin={profile.role === "admin"} />
      <LeadDetail
        lead={lead}
        activities={activities}
        leadSources={leadSources}
        propertyTypes={propertyTypes}
        agents={agents}
        agentLeads={agentLeads}
        campaigns={campaigns}
        referredLeads={[]}
        evidence={evidence}
        documents={documents}
      />
    </div>
  );
}
