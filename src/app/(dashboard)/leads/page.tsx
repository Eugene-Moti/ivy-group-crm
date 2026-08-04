import { Suspense } from "react";
import {
  getAgentLeads,
  getAgents,
  getLeads,
  getLeadSources,
  getPropertyTypes,
} from "@/lib/queries/leads";
import { getCampaigns, getLeadColumnLabels } from "@/lib/queries/settings";
import { LeadsDirectory } from "@/components/leads/leads-directory";

export default async function LeadsPage() {
  const [leads, leadSources, propertyTypes, agents, agentLeads, columnLabels, campaigns] =
    await Promise.all([
      getLeads(),
      getLeadSources(),
      getPropertyTypes(),
      getAgents(),
      getAgentLeads(),
      getLeadColumnLabels(),
      getCampaigns(),
    ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Client directory
        </h1>
        <p className="text-sm text-muted-foreground">
          {leads.length} lead{leads.length === 1 ? "" : "s"} in the pipeline
        </p>
      </div>
      <Suspense fallback={null}>
        <LeadsDirectory
          leads={leads}
          leadSources={leadSources}
          propertyTypes={propertyTypes}
          agents={agents}
          agentLeads={agentLeads}
          campaigns={campaigns}
          columnLabels={columnLabels}
        />
      </Suspense>
    </div>
  );
}
