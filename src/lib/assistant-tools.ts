import "server-only";
import { getActivities } from "@/lib/queries/activities";
import { computeFullAnalysis, type ActivitySummary, type EvidenceLeadId } from "@/lib/full-analysis";
import { computeNotifications } from "@/lib/notifications";
import { groupFollowUps } from "@/lib/follow-ups";
import { fullName } from "@/lib/format";
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
 * Every tool is read-only and scoped to data already fetched once per
 * request (RLS-checked, phone/email already masked for non-admin viewers by
 * getLeads()) — tools filter/shape that in-memory data rather than issuing
 * fresh Supabase queries per call, so a multi-tool-call conversation turn
 * stays fast and never bypasses the app's existing visibility rules.
 */
export function buildAssistantTools(ctx: {
  leads: LeadWithRelations[];
  activitySummaries: ActivitySummary[];
  evidenceLeadIds: EvidenceLeadId[];
  stages: PipelineStage[];
  statusLabels: Record<string, string>;
}): { tools: ToolDefinition[]; executors: Record<string, ToolExecutor> } {
  const { leads, activitySummaries, evidenceLeadIds, stages, statusLabels } = ctx;
  const evidenceSet = new Set(evidenceLeadIds.map((e) => e.lead_id));

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

  return { tools, executors };
}
