import { CLOSED_STATUS_KEYS, REFERRED_CLIENT_ACTIVE_STATUS_KEY } from "@/lib/constants";
import type { LeadWithRelations } from "@/lib/queries/leads";

export { REFERRED_CLIENT_ACTIVE_STATUS_KEY };

const ON_HOLD_STATUS_KEY = "on_hold";
const RESOLVED_STATUS_KEYS = [ON_HOLD_STATUS_KEY, REFERRED_CLIENT_ACTIVE_STATUS_KEY];

export type DualActivePair = {
  agent: LeadWithRelations;
  client: LeadWithRelations;
};

/**
 * Agent leads that are still active in the pipeline while a client they
 * referred is ALSO still active — i.e. the same deal effectively has two
 * live cards on the Kanban board. Flagged for manual review rather than
 * auto-resolved, since moving an agent's status is a real change worth a
 * human glance first. Agents already resolved (moved to "Referred — Client
 * Active", or manually put On Hold) are excluded so they don't keep
 * reappearing here.
 */
export function findDualActivePairs(leads: LeadWithRelations[]): DualActivePair[] {
  const pairs: DualActivePair[] = [];

  const activeAgents = leads.filter(
    (l) =>
      l.lead_type === "Real Estate Agent" &&
      !CLOSED_STATUS_KEYS.includes(l.status) &&
      !RESOLVED_STATUS_KEYS.includes(l.status)
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
