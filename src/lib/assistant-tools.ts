import "server-only";
import { randomUUID } from "node:crypto";
import { getActivities } from "@/lib/queries/activities";
import { computeFullAnalysis, type ActivitySummary, type EvidenceLeadId } from "@/lib/full-analysis";
import { computeNotifications } from "@/lib/notifications";
import { groupFollowUps } from "@/lib/follow-ups";
import { fullName } from "@/lib/format";
import { LOGGABLE_ACTIVITY_TYPES } from "@/lib/activity";
import {
  AGENT_LOST_REASONS,
  CLIENT_LOST_REASONS,
  LEAD_PRIORITIES,
  LOST_STATUS_KEY,
  WON_STATUS_KEY,
  getLostReasons,
  type ActivityType,
} from "@/lib/constants";
import type { ProposedAction } from "@/lib/assistant-actions";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { PipelineStage } from "@/lib/queries/settings";
import type { ToolDefinition, ToolExecutor } from "@/lib/groq";

const SEARCH_LIMIT_DEFAULT = 20;
const SEARCH_LIMIT_MAX = 50;

function summarizeLead(lead: LeadWithRelations, statusLabels: Record<string, string>) {
  return {
    id: lead.id,
    name: fullName(lead),
    lead_type: lead.lead_type,
    status: statusLabels[lead.status] ?? lead.status,
    priority: lead.priority,
    manager: lead.assigned_agent?.name ?? null,
    source: lead.lead_source?.name ?? null,
    project: lead.property_type?.name ?? null,
    location: lead.property_type?.location ?? null,
    budget_min: lead.budget_min,
    budget_max: lead.budget_max,
    next_follow_up_at: lead.next_follow_up_at,
    last_contact_at: lead.last_contact_at,
    created_at: lead.created_at,
    lost_reason: lead.lost_reason,
    referred_by: lead.referred_by ? fullName(lead.referred_by) : null,
  };
}

/**
 * Read tools are scoped to data already fetched once per request (RLS-
 * checked, phone/email already masked for non-admin viewers by getLeads())
 * — they filter/shape that in-memory data rather than issuing fresh
 * Supabase queries per call, so a multi-tool-call conversation turn stays
 * fast and never bypasses the app's existing visibility rules.
 *
 * Write tools (admins only) never touch the database themselves — each one
 * validates its inputs and pushes a `ProposedAction` onto the returned
 * array, which the route handler sends back to the client as-is. The actual
 * write only happens if a human clicks Confirm in the chat panel, which
 * calls the matching apply* function in lib/assistant-actions.ts directly —
 * this function, and the model, never execute a write.
 */
export function buildAssistantTools(ctx: {
  leads: LeadWithRelations[];
  activitySummaries: ActivitySummary[];
  evidenceLeadIds: EvidenceLeadId[];
  stages: PipelineStage[];
  statusLabels: Record<string, string>;
  isAdminUser: boolean;
}): { tools: ToolDefinition[]; executors: Record<string, ToolExecutor>; proposedActions: ProposedAction[] } {
  const { leads, activitySummaries, evidenceLeadIds, stages, statusLabels, isAdminUser } = ctx;
  const evidenceSet = new Set(evidenceLeadIds.map((e) => e.lead_id));
  const proposedActions: ProposedAction[] = [];

  const tools: ToolDefinition[] = [
    {
      name: "search_leads",
      description:
        "Search/filter CRM leads (both direct clients and referring real-estate agents). Returns a compact list, capped at a limit — use get_lead_detail for full notes/activity on one specific lead. Always use this instead of guessing which leads match a question.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description: `Pipeline stage key, exact match. One of: ${stages.map((s) => s.key).join(", ")}`,
          },
          priority: { type: "string", enum: ["Hot", "Warm", "Cold"] },
          lead_type: { type: "string", enum: ["Direct Client", "Real Estate Agent"] },
          manager: { type: "string", description: "Sales manager name, partial match" },
          source: { type: "string", description: "Lead source name, partial match" },
          project: { type: "string", description: "Project/property name, partial match" },
          text: { type: "string", description: "Free text match against the lead's name" },
          limit: {
            type: "number",
            description: `Max results to return, default ${SEARCH_LIMIT_DEFAULT}, capped at ${SEARCH_LIMIT_MAX}`,
          },
        },
      },
    },
    {
      name: "get_lead_detail",
      description: "Full detail for one lead by id, including its logged notes/activity timeline.",
      parameters: {
        type: "object",
        properties: { lead_id: { type: "string", description: "The lead's id, from search_leads" } },
        required: ["lead_id"],
      },
    },
    {
      name: "get_notifications",
      description:
        "The current 'needs attention' list: overdue follow-ups, site visits due, Hot leads gone quiet, possible duplicate leads, stale open leads, and win-back candidates.",
      parameters: { type: "object", properties: {} },
    },
    {
      name: "get_full_analysis",
      description:
        "The full pipeline analysis: KPIs (totals, conversion rate, coverage), generated insights/suggestions, and breakdowns by sales manager, project, source, status, and month.",
      parameters: { type: "object", properties: {} },
    },
    {
      name: "get_follow_ups",
      description: "Leads grouped by follow-up urgency: overdue, due today, and due within the next 7 days.",
      parameters: { type: "object", properties: {} },
    },
  ];

  if (isAdminUser) {
    tools.push(
      {
        name: "propose_status_change",
        description:
          "Draft moving a lead to a different pipeline stage. This does NOT apply the change — it only prepares a proposal the human must confirm in the UI. If new_status is the lost stage, lost_reason is required (ask the user for one if they haven't given it) — one of the exact values listed.",
        parameters: {
          type: "object",
          properties: {
            lead_id: { type: "string", description: "The lead's id, from search_leads" },
            new_status: {
              type: "string",
              description: `Pipeline stage key, exact match. One of: ${stages.map((s) => s.key).join(", ")}`,
            },
            lost_reason: {
              type: "string",
              description: `Required only when new_status is "${LOST_STATUS_KEY}". The valid list depends on the lead's type (Direct Client vs Real Estate Agent) — check with get_lead_detail or search_leads first, or just try one and read the error for the exact list. Client reasons: ${CLIENT_LOST_REASONS.join(", ")}. Agent reasons: ${AGENT_LOST_REASONS.join(", ")}.`,
            },
            lost_reason_note: { type: "string", description: "Optional free-text detail on the lost reason" },
          },
          required: ["lead_id", "new_status"],
        },
      },
      {
        name: "propose_priority_change",
        description: "Draft changing a lead's priority. Does not apply it — prepares a proposal to confirm.",
        parameters: {
          type: "object",
          properties: {
            lead_id: { type: "string", description: "The lead's id, from search_leads" },
            new_priority: { type: "string", enum: [...LEAD_PRIORITIES] },
          },
          required: ["lead_id", "new_priority"],
        },
      },
      {
        name: "propose_follow_up",
        description:
          "Draft scheduling (or rescheduling) a lead's next follow-up date. Does not apply it — prepares a proposal to confirm.",
        parameters: {
          type: "object",
          properties: {
            lead_id: { type: "string", description: "The lead's id, from search_leads" },
            next_follow_up_at: {
              type: "string",
              description: "ISO date or datetime, e.g. 2026-08-20 or 2026-08-20T14:00:00",
            },
          },
          required: ["lead_id", "next_follow_up_at"],
        },
      },
      {
        name: "propose_note",
        description:
          "Draft logging a note/call/email/whatsapp/viewing activity on a lead. Does not apply it — prepares a proposal to confirm.",
        parameters: {
          type: "object",
          properties: {
            lead_id: { type: "string", description: "The lead's id, from search_leads" },
            activity_type: { type: "string", enum: [...LOGGABLE_ACTIVITY_TYPES], description: "Defaults to note" },
            body: { type: "string", description: "The note/activity text" },
          },
          required: ["lead_id", "body"],
        },
      }
    );
  }

  const executors: Record<string, ToolExecutor> = {
    search_leads(args) {
      const limit = Math.min(Number(args.limit) || SEARCH_LIMIT_DEFAULT, SEARCH_LIMIT_MAX);
      const text = typeof args.text === "string" ? args.text.toLowerCase() : null;
      const manager = typeof args.manager === "string" ? args.manager.toLowerCase() : null;
      const source = typeof args.source === "string" ? args.source.toLowerCase() : null;
      const project = typeof args.project === "string" ? args.project.toLowerCase() : null;

      const filtered = leads.filter((l) => {
        if (args.status && l.status !== args.status) return false;
        if (args.priority && l.priority !== args.priority) return false;
        if (args.lead_type && l.lead_type !== args.lead_type) return false;
        if (manager && !(l.assigned_agent?.name ?? "").toLowerCase().includes(manager)) return false;
        if (source && !(l.lead_source?.name ?? "").toLowerCase().includes(source)) return false;
        if (project && !(l.property_type?.name ?? "").toLowerCase().includes(project)) return false;
        if (text && !fullName(l).toLowerCase().includes(text)) return false;
        return true;
      });

      return {
        total_matches: filtered.length,
        leads: filtered.slice(0, limit).map((l) => summarizeLead(l, statusLabels)),
      };
    },

    async get_lead_detail(args) {
      const leadId = typeof args.lead_id === "string" ? args.lead_id : null;
      const lead = leadId ? leads.find((l) => l.id === leadId) : undefined;
      if (!lead) return { error: "No lead found with that id. Use search_leads first." };

      const activities = await getActivities(lead.id);
      return {
        ...summarizeLead(lead, statusLabels),
        has_evidence: evidenceSet.has(lead.id),
        notes_field: lead.notes,
        activity_timeline: activities.slice(0, 15).map((a) => ({
          type: a.type,
          body: a.body,
          by: a.author?.full_name ?? null,
          at: a.created_at,
        })),
      };
    },

    get_notifications() {
      return computeNotifications(leads, activitySummaries);
    },

    get_full_analysis() {
      return computeFullAnalysis(leads, activitySummaries, evidenceLeadIds, statusLabels, stages);
    },

    get_follow_ups() {
      const grouped = groupFollowUps(leads, new Date());
      const compact = (arr: LeadWithRelations[]) => arr.map((l) => summarizeLead(l, statusLabels));
      return {
        overdue: compact(grouped.overdue),
        due_today: compact(grouped.dueToday),
        upcoming_this_week: compact(grouped.upcoming),
      };
    },
  };

  if (isAdminUser) {
    Object.assign(executors, {
      propose_status_change(args: Record<string, unknown>) {
        const leadId = typeof args.lead_id === "string" ? args.lead_id : null;
        const lead = leadId ? leads.find((l) => l.id === leadId) : undefined;
        if (!lead) return { error: "No lead found with that id. Use search_leads first." };

        const newStatus = typeof args.new_status === "string" ? args.new_status : null;
        const stage = newStatus ? stages.find((s) => s.key === newStatus) : undefined;
        if (!stage) {
          return { error: `Invalid new_status. Must be one of: ${stages.map((s) => s.key).join(", ")}` };
        }

        if (newStatus === WON_STATUS_KEY && lead.lead_type === "Real Estate Agent") {
          return {
            error:
              "This lead is a Real Estate Agent, not a client — an agent's own card can never be marked Won. Use propose_status_change is not the right tool here; the human needs to use \"Add client details\" on the agent's lead page first to create a client lead for whoever they referred, then that client lead can be proposed as Won.",
          };
        }

        let lostReason: { reason: string; note: string } | undefined;
        if (newStatus === LOST_STATUS_KEY) {
          const validReasons = getLostReasons(lead.lead_type);
          const reason = typeof args.lost_reason === "string" ? args.lost_reason : null;
          if (!reason || !(validReasons as string[]).includes(reason)) {
            return {
              error: `lost_reason is required when moving a lead to the lost stage, and must match this lead's type (${lead.lead_type}).`,
              valid_lost_reasons: validReasons,
            };
          }
          lostReason = { reason, note: typeof args.lost_reason_note === "string" ? args.lost_reason_note : "" };
        }

        const leadName = fullName(lead);
        const previousLabel = statusLabels[lead.status] ?? lead.status;
        const action: ProposedAction = {
          id: randomUUID(),
          kind: "status_change",
          leadId: lead.id,
          leadName,
          previousStatus: lead.status,
          newStatus: stage.key,
          newStatusLabel: stage.label,
          lostReason,
          summary: `Move ${leadName} from ${previousLabel} to ${stage.label}${lostReason ? ` (reason: ${lostReason.reason})` : ""}`,
        };
        proposedActions.push(action);
        return { proposed: true, summary: action.summary, note: "Waiting on the user to confirm this in the panel." };
      },

      propose_priority_change(args: Record<string, unknown>) {
        const leadId = typeof args.lead_id === "string" ? args.lead_id : null;
        const lead = leadId ? leads.find((l) => l.id === leadId) : undefined;
        if (!lead) return { error: "No lead found with that id. Use search_leads first." };

        const newPriority = typeof args.new_priority === "string" ? args.new_priority : null;
        if (!newPriority || !(LEAD_PRIORITIES as readonly string[]).includes(newPriority)) {
          return { error: `Invalid new_priority. Must be one of: ${LEAD_PRIORITIES.join(", ")}` };
        }

        const leadName = fullName(lead);
        const action: ProposedAction = {
          id: randomUUID(),
          kind: "priority_change",
          leadId: lead.id,
          leadName,
          previousPriority: lead.priority,
          newPriority,
          summary: `Change ${leadName}'s priority from ${lead.priority} to ${newPriority}`,
        };
        proposedActions.push(action);
        return { proposed: true, summary: action.summary, note: "Waiting on the user to confirm this in the panel." };
      },

      propose_follow_up(args: Record<string, unknown>) {
        const leadId = typeof args.lead_id === "string" ? args.lead_id : null;
        const lead = leadId ? leads.find((l) => l.id === leadId) : undefined;
        if (!lead) return { error: "No lead found with that id. Use search_leads first." };

        const raw = typeof args.next_follow_up_at === "string" ? args.next_follow_up_at : null;
        const parsed = raw ? new Date(raw) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) {
          return { error: "Invalid next_follow_up_at — provide a parseable ISO date or datetime." };
        }

        const leadName = fullName(lead);
        const action: ProposedAction = {
          id: randomUUID(),
          kind: "follow_up",
          leadId: lead.id,
          leadName,
          nextFollowUpAt: parsed.toISOString(),
          summary: `Schedule ${leadName}'s next follow-up for ${parsed.toLocaleString()}`,
        };
        proposedActions.push(action);
        return { proposed: true, summary: action.summary, note: "Waiting on the user to confirm this in the panel." };
      },

      propose_note(args: Record<string, unknown>) {
        const leadId = typeof args.lead_id === "string" ? args.lead_id : null;
        const lead = leadId ? leads.find((l) => l.id === leadId) : undefined;
        if (!lead) return { error: "No lead found with that id. Use search_leads first." };

        const body = typeof args.body === "string" ? args.body.trim() : "";
        if (!body) return { error: "body is required." };

        const rawType = typeof args.activity_type === "string" ? args.activity_type : "note";
        const activityType = (
          LOGGABLE_ACTIVITY_TYPES.includes(rawType as ActivityType) ? rawType : "note"
        ) as ActivityType;

        const leadName = fullName(lead);
        const action: ProposedAction = {
          id: randomUUID(),
          kind: "note",
          leadId: lead.id,
          leadName,
          activityType,
          body,
          summary: `Log a ${activityType} on ${leadName}: "${body.length > 80 ? body.slice(0, 80) + "…" : body}"`,
        };
        proposedActions.push(action);
        return { proposed: true, summary: action.summary, note: "Waiting on the user to confirm this in the panel." };
      },
    });
  }

  return { tools, executors, proposedActions };
}
