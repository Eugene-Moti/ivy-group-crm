import { redirect } from "next/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { getAgents, getLeadSources, getPropertyTypes } from "@/lib/queries/leads";
import { getAllProfiles, getCampaigns, getLeadColumnLabels } from "@/lib/queries/settings";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) {
    redirect("/dashboard");
  }

  const [leadSources, propertyTypes, salesAgents, campaigns, profiles, columnLabels] =
    await Promise.all([
      getLeadSources(),
      getPropertyTypes(),
      getAgents(),
      getCampaigns(),
      getAllProfiles(),
      getLeadColumnLabels(),
    ]);

  return (
    <SettingsView
      leadSources={leadSources}
      propertyTypes={propertyTypes}
      salesAgents={salesAgents}
      campaigns={campaigns}
      profiles={profiles}
      columnLabels={columnLabels}
    />
  );
}
