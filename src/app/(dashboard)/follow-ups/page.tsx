import { getAgents, getLeads } from "@/lib/queries/leads";
import { groupFollowUps } from "@/lib/follow-ups";
import { FollowUpsView } from "@/components/follow-ups/follow-ups-view";

export default async function FollowUpsPage() {
  const [leads, agents] = await Promise.all([getLeads(), getAgents()]);
  const { overdue, dueToday, upcoming } = groupFollowUps(leads, new Date());

  return (
    <FollowUpsView overdue={overdue} dueToday={dueToday} upcoming={upcoming} agents={agents} />
  );
}
