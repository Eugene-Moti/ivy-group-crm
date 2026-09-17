import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getLeads, type LeadWithRelations } from "@/lib/queries/leads";
import { getActivities, getAllActivitySummaries } from "@/lib/queries/activities";
import { getAllEvidenceLeadIds } from "@/lib/queries/evidence";
import { getUnitsSold } from "@/lib/queries/units-sold";
import { getPipelineStages } from "@/lib/queries/settings";
import { buildAssistantTools } from "@/lib/assistant-tools";
import { runClaudeAssistant, type SimpleMessage } from "@/lib/claude";
import { orionSystemPrompt } from "@/lib/orion";
import { getOrionBusinessContextForRequest } from "@/lib/queries/orion-context";
import { fullName } from "@/lib/format";

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

function systemPrompt(
  userName: string | null,
  isAdminUser: boolean,
  scopedLeadContext: string | null,
  businessContext: string
): string {
  return `${orionSystemPrompt(businessContext)}

Today's date is ${new Date().toDateString()}. You're talking to ${userName ?? "a team member"}${isAdminUser ? " (admin)" : " (viewer — phone/email are hidden from them by design, don't imply you're withholding anything)"}${scopedLeadContext ? " from that lead's own page" : " on your own dedicated page"} — this is a focused work session, not a quick lookup, so it's fine to be thorough: pull multiple tools, cross-reference, and give a real analysis rather than the shortest possible answer.

${
  scopedLeadContext
    ? `The admin has this specific lead open right now — you've already been given its full detail, notes, and activity timeline below, so answer about it directly without needing to search for it first (still use search_leads/get_lead_detail for anything about a *different* lead they bring up).\n\n${scopedLeadContext}\n`
    : ""
}You have read-only tools to search and inspect real data (leads, notifications, the full pipeline analysis, follow-up urgency, units sold). ALWAYS use a tool to ground any claim about specific leads, counts, or names — never invent a lead, a number, or a name. If a tool returns nothing relevant, say so plainly rather than guessing.

${
  isAdminUser
    ? `You also have propose_* tools (status change, priority change, follow-up date, note/activity, reminder). These NEVER apply anything by themselves — calling one only drafts a proposal that appears as a card the human must explicitly click Confirm on. Before calling one, say in your own words what you'd recommend and why, grounded in the notes/evidence/history you've actually reviewed — never call a propose_* tool as your first move with no explanation. Never claim something has been changed, scheduled, or logged — only that you've drafted it for their review. If moving a lead to the lost stage, you must have a lost_reason first; ask the user which reason applies (from the exact allowed list) before proposing it.`
    : `This user is a viewer, not an admin, so you have no ability to propose changes — if asked to change something, say only an admin can do that here.`
}

Formatting: this renders as real markdown, not plain text, so use it to make dense information easy to scan — short paragraphs, **bold** for key terms/numbers, bullet or numbered lists when covering multiple leads or steps. Don't over-format a one-line answer, and skip headings unless the reply genuinely has multiple sections.`;
}

/**
 * The same shape get_lead_detail returns, built once here so a scoped
 * conversation starts already grounded instead of needing a tool round-trip
 * for the lead the admin is already looking at. `includeContact` gates
 * phone/email the same way summarizeLead() in assistant-tools.ts does —
 * viewers never get them, admins do.
 */
function buildScopedLeadContext(
  lead: LeadWithRelations,
  activities: Awaited<ReturnType<typeof getActivities>>,
  statusLabels: Record<string, string>,
  includeContact: boolean
): string {
  return `CURRENTLY OPEN LEAD:
${JSON.stringify(
  {
    id: lead.id,
    name: fullName(lead),
    lead_type: lead.lead_type,
    status: statusLabels[lead.status] ?? lead.status,
    priority: lead.priority,
    manager: lead.assigned_agent?.name ?? null,
    source: lead.lead_source?.name ?? null,
    project: lead.property_type?.name ?? null,
    budget_min: lead.budget_min,
    budget_max: lead.budget_max,
    next_follow_up_at: lead.next_follow_up_at,
    last_contact_at: lead.last_contact_at,
    created_at: lead.created_at,
    notes_field: lead.notes,
    lost_reason: lead.lost_reason,
    lost_reason_note: lead.lost_reason_note,
    ...(includeContact ? { phone: lead.phone, email: lead.email } : {}),
    activity_timeline: activities.slice(0, 30).map((a) => ({
      type: a.type,
      body: a.body,
      by: a.author?.full_name ?? null,
      at: a.created_at,
    })),
  },
  null,
  2
)}`;
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Orion isn't configured yet — ask an admin to set ANTHROPIC_API_KEY." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as { messages?: unknown; leadId?: unknown } | null;
  const incoming: unknown[] | null = Array.isArray(body?.messages) ? body.messages : null;
  if (!incoming) {
    return NextResponse.json({ error: "Expected a messages array." }, { status: 400 });
  }
  const scopedLeadId = typeof body?.leadId === "string" ? body.leadId : null;

  const history: SimpleMessage[] = incoming
    .filter(
      (m): m is { role: string; content: string } =>
        !!m &&
        typeof m === "object" &&
        (("role" in m && (m as { role: unknown }).role === "user") ||
          (m as { role: unknown }).role === "assistant") &&
        typeof (m as { content: unknown }).content === "string"
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content.slice(0, MAX_MESSAGE_LENGTH),
    }));

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ error: "The last message must be from the user." }, { status: 400 });
  }

  try {
    const [leads, activitySummaries, evidenceLeadIds, unitsSold, stages, businessContext] = await Promise.all([
      getLeads(),
      getAllActivitySummaries(),
      getAllEvidenceLeadIds(),
      getUnitsSold(),
      getPipelineStages(),
      getOrionBusinessContextForRequest().catch(() => ""),
    ]);
    const statusLabels = Object.fromEntries(stages.map((s) => [s.key, s.label]));
    const isAdminUser = profile.role === "admin";

    let scopedLeadContext: string | null = null;
    const scopedLead = scopedLeadId ? leads.find((l) => l.id === scopedLeadId) : undefined;
    if (scopedLead) {
      const activities = await getActivities(scopedLead.id);
      scopedLeadContext = buildScopedLeadContext(scopedLead, activities, statusLabels, isAdminUser);
    }

    const { tools, executors, proposedActions } = buildAssistantTools({
      leads,
      activitySummaries,
      evidenceLeadIds,
      unitsSold,
      stages,
      statusLabels,
      isAdminUser,
    });

    const reply = await runClaudeAssistant({
      system: systemPrompt(profile.full_name, isAdminUser, scopedLeadContext, businessContext),
      messages: history,
      tools,
      executors,
    });

    return NextResponse.json({ reply, pendingActions: proposedActions });
  } catch (err) {
    console.error("Orion chat request failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Orion hit an unexpected error." },
      { status: 500 }
    );
  }
}
