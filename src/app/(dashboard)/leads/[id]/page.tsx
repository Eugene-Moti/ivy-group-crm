import { notFound } from "next/navigation";
import { getAgents, getLead, getLeadSources, getPropertyTypes } from "@/lib/queries/leads";
import { getActivities } from "@/lib/queries/activities";
import { LeadDetail } from "@/components/leads/lead-detail";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead, activities, leadSources, propertyTypes, agents] = await Promise.all([
    getLead(id),
    getActivities(id),
    getLeadSources(),
    getPropertyTypes(),
    getAgents(),
  ]);

  if (!lead) notFound();

  return (
    <LeadDetail
      lead={lead}
      activities={activities}
      leadSources={leadSources}
      propertyTypes={propertyTypes}
      agents={agents}
    />
  );
}
