import { computeFullAnalysis, type ActivitySummary, type EvidenceLeadId } from "@/lib/full-analysis";
import { computeNotifications } from "@/lib/notifications";
import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { UnitSoldRow } from "@/lib/queries/units-sold";
import type { PipelineStage } from "@/lib/queries/settings";
import type { ReminderWithLeadName } from "@/lib/queries/reminders";

export const ORION_NAME = "Orion";

const NAIROBI_OFFSET_MS = 3 * 60 * 60 * 1000; // EAT is a fixed UTC+3, no DST

/** The [start, end] UTC instants bounding a given moment's calendar day in Nairobi (EAT). */
export function nairobiDayBounds(at: Date): { start: Date; end: Date } {
  const shifted = new Date(at.getTime() + NAIROBI_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return {
    start: new Date(Date.UTC(y, m, d, 0, 0, 0) - NAIROBI_OFFSET_MS),
    end: new Date(Date.UTC(y, m, d, 23, 59, 59, 999) - NAIROBI_OFFSET_MS),
  };
}

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
- A "reminder" is a site visit or meeting appointment an admin scheduled against a lead (title, optional notes, a date/time) — separate from next_follow_up_at, surfaced in the daily briefing rather than a real-time push.

Ground every claim in the data you're given or the tools you're offered — never invent a lead, a number, or a name. If a note, a lead's details, or what someone's asking is genuinely ambiguous or contradictory, say what's unclear and ask rather than guessing — a wrong guess acted on is worse than a clarifying question. This applies double before proposing any change: if you're not confident which lead, which value, or which date someone means, ask first.`;

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
  reminders?: ReminderWithLeadName[];
}): string {
  const { leads, activitySummaries, evidenceLeadIds, unitsSold, stages, statusLabels, reminders = [] } = ctx;
  const { start: todayStart, end: todayEnd } = nairobiDayBounds(new Date());
  const remindersDueToday = reminders.filter(
    (r) => new Date(r.remind_at) >= todayStart && new Date(r.remind_at) <= todayEnd
  );
  const remindersUpcoming = reminders.filter((r) => new Date(r.remind_at) > todayEnd);
  const summarizeReminder = (r: ReminderWithLeadName) => ({
    lead_name: r.lead_name,
    title: r.title,
    notes: r.notes,
    remind_at: r.remind_at,
  });

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
    reminders_due_today: remindersDueToday.map(summarizeReminder),
    reminders_upcoming: remindersUpcoming.map(summarizeReminder),
    open_leads: openLeads.slice(0, 150).map((l) => summarizeLead(l, statusLabels)),
  });
}

export type OrionBriefingItem = {
  severity: "critical" | "warning" | "positive" | "info";
  title: string;
  detail: string;
  leads?: { id: string; name: string }[];
};

export type OrionBriefing = {
  headline: string;
  items: OrionBriefingItem[];
  recommendations: string[];
  generatedAt: string;
  raw?: string;
};

/** Only relative-order-independent info the model can safely be trusted to have echoed back verbatim: names. Resolved here against real leads so a link is only ever shown when it's genuinely valid. */
function resolveLeadNames(names: unknown, leads: LeadWithRelations[]): { id: string; name: string }[] | undefined {
  if (!Array.isArray(names)) return undefined;
  const byLowerName = new Map(leads.map((l) => [fullName(l).toLowerCase(), l]));
  const resolved = names
    .filter((n): n is string => typeof n === "string")
    .map((n) => byLowerName.get(n.trim().toLowerCase()))
    .filter((l): l is LeadWithRelations => !!l)
    .map((l) => ({ id: l.id, name: fullName(l) }));
  return resolved.length > 0 ? resolved : undefined;
}

/**
 * Parses Claude's structured briefing JSON (headline/items/recommendations)
 * into an OrionBriefing, resolving each item's lead names against the real
 * leads array. Shared by the on-demand Portfolio Briefing and the daily
 * digest email so both render from an identical, verified shape — and so
 * the same PDF export function works for either. Falls back to a raw-text
 * shape on a parse failure so nothing is lost even if the model's output
 * isn't valid JSON.
 */
export function parseBriefing(raw: string, leads: LeadWithRelations[]): OrionBriefing {
  const generatedAt = new Date().toISOString();
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    if (typeof parsed.headline === "string" && Array.isArray(parsed.items)) {
      return {
        headline: parsed.headline,
        items: parsed.items
          .filter(
            (i: unknown): i is Record<string, unknown> =>
              !!i && typeof i === "object" && typeof (i as Record<string, unknown>).title === "string"
          )
          .map(
            (i: Record<string, unknown>): OrionBriefingItem => ({
              severity: (["critical", "warning", "positive", "info"] as const).includes(
                i.severity as never
              )
                ? (i.severity as OrionBriefingItem["severity"])
                : "info",
              title: i.title as string,
              detail: typeof i.detail === "string" ? i.detail : "",
              leads: resolveLeadNames(i.leadNames, leads),
            })
          ),
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.filter((r: unknown) => typeof r === "string")
          : [],
        generatedAt,
      };
    }
  } catch {
    // fall through to the raw-text fallback below
  }
  return { headline: "", items: [], recommendations: [], generatedAt, raw };
}

/**
 * The JSON-briefing instructions shared by both surfaces that ask Claude
 * for a structured Portfolio Briefing — the on-demand page and the daily
 * digest email — differing only in the one line of framing that says where
 * this is being read.
 */
export function briefingPrompt(context: "page" | "email"): string {
  const framing =
    context === "page"
      ? "You're writing the Portfolio Briefing shown at the top of your own dedicated page in the CRM — the first thing an admin sees."
      : "You're writing today's automated Daily Briefing email, sent to every admin's inbox once a day — this is a ONE-SHOT briefing, not a conversation.";

  return `${framing} You're given the full, already-computed state of the pipeline below as JSON: KPIs, breakdowns by manager/project/source, deterministic insights, the current "needs attention" list (each with the exact leads behind it), recent unit sales, today's/upcoming scheduled reminders (site visits, meetings), and a list of open leads.

Read all of it, then respond with ONLY a JSON object (no markdown fences, no commentary before or after) in exactly this shape:
{
  "headline": "1-2 sentences on overall pipeline health and momentum right now, in your own voice.",
  "items": [
    { "severity": "critical" | "warning" | "positive" | "info", "title": "short, specific", "detail": "1-2 sentences, cite real numbers/names from the data", "leadNames": ["exact lead name", "..."] }
  ],
  "recommendations": ["one concrete, specific action — who should do what", "..."]
}

Guidelines:
- 4-7 items, ordered most-important-first. Don't just restate the deterministic_insights list — synthesize across overview/by_manager/by_project/needs_attention to surface what actually matters, and point out anything the raw numbers hint at that a single metric wouldn't (e.g. a manager whose win rate is fine but whose pipeline is thinning).
- If reminders_due_today has any entries, give it its own item near the top (severity "info") naming the lead, the title, and the time — these are scheduled site visits/meetings, not something to bury.
- leadNames must be copied exactly, character-for-character, from a "name" field already present in the data — never paraphrase. Omit the field entirely if an item isn't about specific leads.
- 3-5 recommendations, concrete enough to act on today, not generic advice ("follow up more").
- Never invent a number, name, or fact not present in the data. If something in the notes or the data looks contradictory or unclear, say so as its own item rather than guessing at what it means.

DATA:
`;
}
