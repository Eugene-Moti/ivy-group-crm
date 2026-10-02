import { notFound } from "next/navigation";
import {
  getAgentLeads,
  getAgents,
  getLead,
  getLeadSources,
  getPropertyTypes,
  getReferredLeads,
  getRepeatLeads,
} from "@/lib/queries/leads";
import { getActivities } from "@/lib/queries/activities";
import { getLeadEvidence } from "@/lib/queries/evidence";
import { getLeadDocuments } from "@/lib/queries/documents";
import { getCampaigns } from "@/lib/queries/settings";
import { getUpcomingReminders } from "@/lib/queries/reminders";
import { LeadDetail } from "@/components/leads/lead-detail";

/**
 * A missing table/column from a not-yet-run migration (or any other
 * transient failure) on one secondary section shouldn't take down the
 * entire lead page — better to show the lead with that one section empty
 * than a blank error screen for every lead.
 */
async function safe<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await promise;
  } catch (err) {
    console.error(`Lead detail page: failed to load ${label}`, err);
    return fallback;
  }
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [
    lead,
    activities,
    leadSources,
    propertyTypes,
    agents,
    agentLeads,
    evidence,
    documents,
    campaigns,
    reminders,
    repeatLeads,
  ] = await Promise.all([
    getLead(id),
    getActivities(id),
    getLeadSources(),
    getPropertyTypes(),
    getAgents(),
    getAgentLeads(),
    safe(getLeadEvidence(id), [], "evidence"),
    safe(getLeadDocuments(id), [], "documents"),
    getCampaigns(),
    safe(getUpcomingReminders(id), [], "reminders"),
    safe(getRepeatLeads(id), [], "repeat leads"),
  ]);

  if (!lead) notFound();

  const referredLeads =
    lead.lead_type === "Real Estate Agent" ? await getReferredLeads(lead.id) : [];

  return (
    <LeadDetail
      lead={lead}
      activities={activities}
      leadSources={leadSources}
      propertyTypes={propertyTypes}
      agents={agents}
      agentLeads={agentLeads}
      campaigns={campaigns}
      referredLeads={referredLeads}
      repeatLeads={repeatLeads}
      evidence={evidence}
      documents={documents}
      reminders={reminders}
    />
  );
}
