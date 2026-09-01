import { Suspense } from "react";
import { getAgents, getLeads, getLeadSources, getPropertyTypes } from "@/lib/queries/leads";
import { getSavedQueries } from "@/lib/queries/saved-queries";
import { getAllActivitySummaries } from "@/lib/queries/activities";
import { getAllEvidenceLeadIds } from "@/lib/queries/evidence";
import { getUnitsSold } from "@/lib/queries/units-sold";
import { ReportsView } from "@/components/reports/reports-view";

export default async function ReportsPage() {
  const [
    leads,
    leadSources,
    propertyTypes,
    agents,
    savedQueries,
    activitySummaries,
    evidenceLeadIds,
    unitsSold,
  ] = await Promise.all([
    getLeads(),
    getLeadSources(),
    getPropertyTypes(),
    getAgents(),
    getSavedQueries(),
    getAllActivitySummaries(),
    getAllEvidenceLeadIds(),
    getUnitsSold(),
  ]);

  return (
    <Suspense fallback={null}>
      <ReportsView
        leads={leads}
        leadSources={leadSources}
        propertyTypes={propertyTypes}
        agents={agents}
        savedQueries={savedQueries}
        activitySummaries={activitySummaries}
        evidenceLeadIds={evidenceLeadIds}
        unitsSold={unitsSold}
      />
    </Suspense>
  );
}
