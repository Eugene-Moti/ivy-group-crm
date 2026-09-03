import { getAllProfiles } from "@/lib/queries/settings";
import { TeamView } from "@/components/team/team-view";

export default async function TeamPage() {
  const profiles = await getAllProfiles();

  return <TeamView profiles={profiles} />;
}
