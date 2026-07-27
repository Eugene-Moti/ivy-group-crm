import { redirect } from "next/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { getAgents, getLeadSources, getPropertyTypes } from "@/lib/queries/leads";
import { getLeadColumnLabels } from "@/lib/queries/settings";
import { ImportWizard } from "@/components/import/import-wizard";

export default async function ImportPage() {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) {
    redirect("/dashboard");
  }

  const [leadSources, propertyTypes, agents, columnLabels] = await Promise.all([
    getLeadSources(),
    getPropertyTypes(),
    getAgents(),
    getLeadColumnLabels(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import leads</h1>
        <p className="text-sm text-muted-foreground">
          Migrate the marketing team&apos;s spreadsheet into the CRM.
        </p>
      </div>
      <ImportWizard
        leadSources={leadSources}
        propertyTypes={propertyTypes}
        agents={agents}
        columnLabels={columnLabels}
      />
    </div>
  );
}
