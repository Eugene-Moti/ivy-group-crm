import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

export type ReferrerPerformance = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  referredCount: number;
  wonCount: number;
  winRate: number;
};

/**
 * One row per "Real Estate Agent" lead, with how many buyer leads they've
 * referred and how those referrals are performing. Agent-to-client linking
 * is optional (some agents don't share client details), so a 0 here means
 * "none recorded", not necessarily "none referred".
 */
export function computeReferrerPerformance(leads: LeadWithRelations[]): ReferrerPerformance[] {
  const agents = leads.filter((l) => l.lead_type === "Real Estate Agent");

  return agents
    .map((agent) => {
      const referred = leads.filter((l) => l.referred_by_lead_id === agent.id);
      const wonCount = referred.filter((l) => l.status === "Closed - Won").length;
      return {
        id: agent.id,
        name: fullName(agent),
        phone: agent.phone,
        email: agent.email,
        referredCount: referred.length,
        wonCount,
        winRate: referred.length > 0 ? (wonCount / referred.length) * 100 : 0,
      };
    })
    .sort((a, b) => b.referredCount - a.referredCount);
}
