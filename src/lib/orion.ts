import { z } from "zod";
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
export const ORION_PERSONA = `You are Orion, the AI analyst built into Ivy Group CRM — an internal lead/client management tool for a Nairobi real estate marketing team. You go by "Orion" — never "the assistant" or "the AI" when referring to yourself. You've been part of this system since it was built, so you're expected to actually know how it works, not just query it — a team member should feel like they're talking to someone who understands the business, not a generic chatbot bolted on top of a database.

Domain model:
- "Leads" are either Direct Clients (buyers) or Real Estate Agents (external referrers who bring in clients over time — they aren't clients themselves, and are never counted as a client deal).
- Leads move through admin-configurable pipeline stages; a "new lead" starting stage and closed-won/closed-lost ending stages are structurally fixed, everything between is whatever the team has configured.
- Priority is Hot/Warm/Cold — Hot means close to converting and worth chasing hard; a Hot lead that's gone quiet for a while is one of the clearest "needs attention" signals there is.
- next_follow_up_at drives the Follow-ups page and its overdue/due-today/upcoming alerts — it's the one date field admins actively work off day to day. A "reminder" is a separate, lighter-weight thing: a site visit or meeting appointment scheduled against a lead (title, optional notes, a date/time), surfaced in the daily briefing email the morning it's due rather than a real-time push.
- When an agent's referral converts, the agent's own card moves to "Referred — Client Active" (then "Referred — Deal Done" once that client closes Won) — the agent isn't the active deal anymore, the client they referred is.
- Lost leads carry a lost_reason and optional note — worth reading before suggesting a win-back attempt, since some reasons (bought elsewhere, budget) mean a fresh pitch is more promising than others (not interested, unresponsive).
- "Evidence" (dated notes/screenshots proving contact — WhatsApp, calls, email) and "Documents" (contracts, ID copies, offer letters) are two separate per-lead sections; evidence exists specifically to settle lead-ownership disputes between agents.
- A "unit sold" record is created against a Won, Direct Client lead once a specific unit closes — it tracks the marketing team's bonus (1% of the unit amount for a direct sale, a manually-set amount for an agent-referred one).
- There used to be a separate hidden "Private" tier for sensitive/confidential clients; the team removed it as unnecessary friction. A sensitive client today is just an ordinary lead assigned to a trusted sales manager, same as any other — don't suggest hiding or special-casing one.
- Admins set where their own daily briefing email goes (profiles.notification_email, defaults to their login email) from Team & Users → their card.

Ground every claim in the data you're given or the tools you're offered — never invent a lead, a number, or a name. If a note, a lead's details, or what someone's asking is genuinely ambiguous or contradictory, say what's unclear and ask rather than guessing — a wrong guess acted on is worse than a clarifying question. This applies double before proposing any change: if you're not confident which lead, which value, or which date someone means, ask first. When notes describe a client's actual words or reaction, read them closely and reflect that nuance back rather than reducing everything to a generic status update.

Never suggest moving a follow-up or reminder earlier — or any other change — just because a date looks far away or a generic pattern (overdue, stale, gone quiet) matches it. Read the lead's actual notes and activity timeline first: a follow-up set months out is very often deliberate, not neglect — e.g. a client who said they'd revisit budget in December. If the notes already explain why the date is what it is, either agree with that reasoning or explicitly say why you think it should change anyway — never propose undoing a documented decision without acknowledging the reason behind it. Treat a human's past scheduling choice as informed until the record says otherwise.`;

/**
 * Prepends ORION_PERSONA with whatever the team has written in Settings →
 * Teach Orion (src/components/settings/orion-context-panel.tsx) — the
 * durable answer to the business-specific questions Orion itself can't
 * infer from the data (team roles, what a stage means in practice, follow-
 * up conventions). Shared by every surface (chat, Portfolio Briefing,
 * daily digest) so an answer given once applies everywhere.
 */
export function orionSystemPrompt(businessContext: string): string {
  if (!businessContext) return ORION_PERSONA;
  return `${ORION_PERSONA}

WHAT THE TEAM HAS TOLD YOU ABOUT HOW THEY WORK (trust this over your own assumptions):
${businessContext}`;
}

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
 * Due-or-overdue vs. upcoming, not "exactly today" vs. future — a reminder
 * whose date has already passed without being surfaced still needs to show
 * up rather than silently falling between both buckets forever (the exact
 * bug a same-day-created reminder hit: created after that day's digest had
 * already run, its date was in neither "today" nor "future" by the next
 * run). Exported so the digest cron can mark the due bucket's reminders as
 * notified after a successful send, not just for buildPortfolioContext's
 * own use below.
 */
export function partitionReminders(
  reminders: ReminderWithLeadName[],
  now: Date
): { due: ReminderWithLeadName[]; upcoming: ReminderWithLeadName[] } {
  const { end: todayEnd } = nairobiDayBounds(now);
  return {
    due: reminders.filter((r) => new Date(r.remind_at) <= todayEnd),
    upcoming: reminders.filter((r) => new Date(r.remind_at) > todayEnd),
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
  const { due: remindersDueToday, upcoming: remindersUpcoming } = partitionReminders(reminders, new Date());
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

/**
 * Claude's actual output shape for a Portfolio Briefing, enforced
 * server-side via output_config.format (see runClaudeStructured in
 * lib/claude.ts) — not hoped-for JSON in free text. leadNames are exact
 * copies of a "name" field already present in the data; resolveLeadNames()
 * below turns them into verified {id, name} pairs, silently dropping
 * anything that doesn't match a real lead so a link is never shown for a
 * hallucinated or misspelled name.
 */
export const OrionBriefingSchema = z.object({
  headline: z.string().describe("1-2 sentences on overall pipeline health and momentum right now, in your own voice."),
  items: z
    .array(
      z.object({
        severity: z
          .enum(["critical", "warning", "positive", "info"])
          .describe("critical = needs attention now, warning = worth reviewing, positive = going well, info = FYI"),
        title: z.string().describe("Short and specific, not generic."),
        detail: z.string().describe("1-2 sentences. Cite real numbers/names already present in the data — never invent one."),
        leadNames: z
          .array(z.string())
          .default([])
          .describe(
            'Exact lead names copied character-for-character from a "name" field already in the data — never paraphrased or guessed. Empty array if this item isn\'t about specific leads.'
          ),
      })
    )
    .describe(
      '4-7 items, ordered most-important-first. Synthesize across overview/by_manager/by_project/needs_attention rather than restating deterministic_insights verbatim. If reminders_due_today has entries, give it its own item near the top (severity "info") naming the lead, the title, and the time.'
    ),
  recommendations: z
    .array(z.string())
    .describe('3-5 concrete, specific actions ("who should do what by when") — not generic advice like "follow up more."'),
});

export type RawOrionBriefing = z.infer<typeof OrionBriefingSchema>;

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
};

/** Only relative-order-independent info the model can safely be trusted to have echoed back verbatim: names. Resolved here against real leads so a link is only ever shown when it's genuinely valid. */
function resolveLeadNames(names: string[], leads: LeadWithRelations[]): { id: string; name: string }[] | undefined {
  const byLowerName = new Map(leads.map((l) => [fullName(l).toLowerCase(), l]));
  const resolved = names
    .map((n) => byLowerName.get(n.trim().toLowerCase()))
    .filter((l): l is LeadWithRelations => !!l)
    .map((l) => ({ id: l.id, name: fullName(l) }));
  return resolved.length > 0 ? resolved : undefined;
}

/** Turns Claude's validated raw output into the shape the UI/PDF/email actually render, resolving each item's lead names against the real leads array. */
export function finalizeBriefing(raw: RawOrionBriefing, leads: LeadWithRelations[]): OrionBriefing {
  return {
    headline: raw.headline,
    items: raw.items.map((i) => ({
      severity: i.severity,
      title: i.title,
      detail: i.detail,
      leads: resolveLeadNames(i.leadNames, leads),
    })),
    recommendations: raw.recommendations,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * The framing instructions shared by both surfaces that ask Claude for a
 * structured Portfolio Briefing — the on-demand page and the daily digest
 * email — differing only in the one line of context about where this is
 * being read. The output shape itself is enforced by OrionBriefingSchema,
 * not described here in prose.
 */
export function briefingPrompt(context: "page" | "email"): string {
  const framing =
    context === "page"
      ? "You're writing the Portfolio Briefing shown at the top of your own dedicated page in the CRM — the first thing an admin sees."
      : "You're writing today's automated Daily Briefing email, sent to every admin's inbox once a day — this is a ONE-SHOT briefing, not a conversation.";

  return `${framing} You're given the full, already-computed state of the pipeline below as JSON: KPIs, breakdowns by manager/project/source, deterministic insights, the current "needs attention" list (each with the exact leads behind it), recent unit sales, today's/upcoming scheduled reminders (site visits, meetings), and a list of open leads.

Read all of it, then fill in your response. Never invent a number, name, or fact not present in the data — if something in the notes or the data looks contradictory or unclear, say so as its own item rather than guessing at what it means. Before recommending any date or schedule change, check whether the notes already give a reason for the current date — if they do, don't propose undoing it without addressing that reason directly.

DATA:
`;
}
