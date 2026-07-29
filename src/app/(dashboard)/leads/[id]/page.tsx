import { notFound } from "next/navigation";
import {
  getAgentLeads,
  getAgents,
  getLead,
  getLeadSources,
  getPropertyTypes,
  getReferredLeads,
} from "@/lib/queries/leads";
import { getActivities } from "@/lib/queries/activities";
import { LeadDetail } from "@/components/leads/lead-detail";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead, activities, leadSources, propertyTypes, agents, agentLeads] = await Promise.all([
    getLead(id),
    getActivities(id),
    getLeadSources(),
    getPropertyTypes(),
    getAgents(),
    getAgentLeads(),
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
      referredLeads={referredLeads}
    />
  );
}
