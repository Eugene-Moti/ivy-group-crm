import { CLOSED_STATUS_KEYS } from "@/lib/constants";
import type { LeadWithRelations } from "@/lib/queries/leads";

const ON_HOLD_STATUS_KEY = "on_hold";

export type DualActivePair = {
  agent: LeadWithRelations;
  client: LeadWithRelations;
};

/**
 * Agent leads that are still active in the pipeline (not closed, not on
 * hold) while a client they referred is ALSO still active — i.e. the same
 * deal effectively has two live cards on the Kanban board. Flagged for
 * manual review rather than auto-resolved, since moving an agent's status
 * is a real change worth a human glance first.
 */
export function findDualActivePairs(leads: LeadWithRelations[]): DualActivePair[] {
  const pairs: DualActivePair[] = [];

  const activeAgents = leads.filter(
    (l) =>
      l.lead_type === "Real Estate Agent" &&
      !CLOSED_STATUS_KEYS.includes(l.status) &&
      l.status !== ON_HOLD_STATUS_KEY
  );

  for (const agent of activeAgents) {
    const activeClients = leads.filter(
      (l) => l.referred_by_lead_id === agent.id && !CLOSED_STATUS_KEYS.includes(l.status)
    );
    for (const client of activeClients) {
      pairs.push({ agent, client });
    }
  }

  return pairs;
}

export { ON_HOLD_STATUS_KEY };
