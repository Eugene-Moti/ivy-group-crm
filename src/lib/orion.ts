import { computeFullAnalysis, type ActivitySummary, type EvidenceLeadId } from "@/lib/full-analysis";
import { computeNotifications } from "@/lib/notifications";
import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { UnitSoldRow } from "@/lib/queries/units-sold";
import type { PipelineStage } from "@/lib/queries/settings";

export const ORION_NAME = "Orion";

/**
 * Orion's identity — shared verbatim across the chat, the on-demand
 * Portfolio Briefing, and the daily email, so it reads as one consistent
 * voice wherever it shows up rather than three differently-tuned bots.
 */
export const ORION_PERSONA = `You are Orion, the AI analyst built into Ivy Group CRM — an internal lead/client management tool for a Nairobi real estate marketing team. You go by "Orion" — never "the assistant" or "the AI" when referring to yourself.

Domain model:
- "Leads" are either Direct Clients (buyers) or Real Estate Agents (external referrers who bring in clients over time — they aren't clients themselves, and are never counted as a client deal).
- Leads move through admin-configurable pipeline stages; a "new lead" starting stage and closed-won/closed-lost ending stages are structurally fixed.
- When an agent's referral converts, the agent's own card moves to "Referred — Client Active" (then "Referred — Deal Done" once that client closes Won) — the agent isn't the active deal anymore, the client they referred is.
- Lost leads carry a lost_reason and optional note.
- A "unit sold" record is created against a Won, Direct Client lead once a specific unit closes — it tracks the marketing team's bonus (1% of the unit amount for a direct sale, a manually-set amount for an agent-referred one).

Ground every claim in the data you're given or the tools you're offered — never invent a lead, a number, or a name. If something isn't covered by what you have, say so plainly rather than guessing.`;

function summarizeLead(lead: LeadWithRelations, statusLabels: Record<string, string>) {
  return {
    id: lead.id,
    name: fullName(lead),
    lead_type: lead.lead_type,
    status: statusLabels[lead.status] ?? lead.status,
    priority: lead.priority,
    manager: lead.assigned_agent?.name ?? null,
    project: lead.property_type?.name ?? null,
    next_follow_up_at: lead.next_follow_up_at,
    last_contact_at: lead.last_contact_at,
    created_at: lead.created_at,
  };
}

/**
 * The same trustworthy, deterministic numbers the Full Analysis report and
 * the Needs Attention card already compute — handed to Claude as ground
 * truth to prioritize and narrate, rather than asking it to recompute
 * stats itself (and risk an arithmetic slip). Shared by the on-demand
 * Portfolio Briefing and the daily digest email so both are built from
 * identical data.
 */
export function buildPortfolioContext(ctx: {
  leads: LeadWithRelations[];
  activitySummaries: ActivitySummary[];
  evidenceLeadIds: EvidenceLeadId[];
  unitsSold: UnitSoldRow[];
  stages: PipelineStage[];
  statusLabels: Record<string, string>;
}): string {
  const { leads, activitySummaries, evidenceLeadIds, unitsSold, stages, statusLabels } = ctx;

  const analysis = computeFullAnalysis(leads, activitySummaries, evidenceLeadIds, statusLabels, stages);
  const notifications = computeNotifications(
    leads,
    activitySummaries.map((a) => ({ lead_id: a.lead_id, created_at: a.created_at })),
    new Date(),
    new Set(unitsSold.map((u) => u.lead_id))
  );

  const recentUnitsSold = unitsSold.slice(0, 20).map((u) => ({
    unit_number: u.unit_number,
    sale_type: u.sale_type,
    unit_amount: u.unit_amount,
    bonus_amount: u.bonus_amount,
    bonus_paid: u.bonus_paid,
    sold_at: u.sold_at,
  }));

  const openLeads = leads.filter((l) => !["closed_won", "closed_lost"].includes(l.status));

  return JSON.stringify({
    generated_at: new Date().toISOString(),
    overview: analysis.overview,
    by_status: analysis.byStatus,
    by_manager: analysis.byManager,
    by_project: analysis.byProject,
    by_source: analysis.bySource,
    deterministic_insights: analysis.insights,
    needs_attention: notifications.map((n) => ({
      severity: n.severity,
      title: n.title,
      detail: n.detail,
      leads: n.leads,
    })),
    recent_units_sold: recentUnitsSold,
    open_leads: openLeads.slice(0, 150).map((l) => summarizeLead(l, statusLabels)),
  });
}
