import { redirect } from "next/navigation";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { getAgents, getLeadSources, getPropertyTypes } from "@/lib/queries/leads";
import { getAllProfiles, getCampaigns, getLeadColumnLabels } from "@/lib/queries/settings";
import { getOrionBusinessContextForRequest } from "@/lib/queries/orion-context";
import { ASK_ORION_ENABLED } from "@/lib/features";
import { SettingsView } from "@/components/settings/settings-view";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) {
    redirect("/dashboard");
  }

  const [leadSources, propertyTypes, salesAgents, campaigns, profiles, columnLabels, orionContext] =
    await Promise.all([
      getLeadSources(),
      getPropertyTypes(),
      getAgents(),
      getCampaigns(),
      getAllProfiles(),
      getLeadColumnLabels(),
      // Falls back to empty rather than breaking the whole Settings page if this migration hasn't run yet.
      ASK_ORION_ENABLED ? getOrionBusinessContextForRequest().catch(() => "") : Promise.resolve(""),
    ]);

  return (
    <SettingsView
      leadSources={leadSources}
      propertyTypes={propertyTypes}
      salesAgents={salesAgents}
      campaigns={campaigns}
      profiles={profiles}
      columnLabels={columnLabels}
      orionContext={orionContext}
    />
  );
}
