import { Suspense } from "react";
import { getAgents, getLeads, getLeadSources, getPropertyTypes } from "@/lib/queries/leads";
import { getSavedQueries } from "@/lib/queries/saved-queries";
import { ReportsView } from "@/components/reports/reports-view";

export default async function ReportsPage() {
  const [leads, leadSources, propertyTypes, agents, savedQueries] = await Promise.all([
    getLeads(),
    getLeadSources(),
    getPropertyTypes(),
    getAgents(),
    getSavedQueries(),
  ]);

  return (
    <Suspense fallback={null}>
      <ReportsView
        leads={leads}
        leadSources={leadSources}
        propertyTypes={propertyTypes}
        agents={agents}
        savedQueries={savedQueries}
      />
    </Suspense>
  );
}
