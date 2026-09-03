import { getAllProfiles, getMonthlyActivityCounts } from "@/lib/queries/settings";
import { TeamView } from "@/components/team/team-view";

export default async function TeamPage() {
  const [profiles, activityCounts] = await Promise.all([
    getAllProfiles(),
    getMonthlyActivityCounts(),
  ]);

  return <TeamView profiles={profiles} activityCounts={activityCounts} />;
}
