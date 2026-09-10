import { requireUnlockedPrivate } from "@/lib/private/guard";
import { getPrivateLeads } from "@/lib/queries/private-leads";
import { getPropertyTypes } from "@/lib/queries/leads";
import { PrivateClientsList } from "@/components/private/private-clients-list";

export default async function PrivateClientsPage() {
  const { profile } = await requireUnlockedPrivate();
  const [leads, projects] = await Promise.all([getPrivateLeads(), getPropertyTypes()]);

  return (
    <PrivateClientsList
      leads={leads}
      projects={projects}
      isAdmin={profile.role === "admin"}
    />
  );
}
