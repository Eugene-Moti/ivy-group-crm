import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getLeads } from "@/lib/queries/leads";
import { getAllActivitySummaries } from "@/lib/queries/activities";
import { getAllEvidenceLeadIds } from "@/lib/queries/evidence";
import { getUnitsSold } from "@/lib/queries/units-sold";
import { getPipelineStages } from "@/lib/queries/settings";
import { buildAssistantTools } from "@/lib/assistant-tools";
import { runGroqAssistant, type ChatMessage } from "@/lib/groq";

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

function systemPrompt(userName: string | null, isAdminUser: boolean): string {
  return `You are the AI Assistant inside Ivy Group CRM, an internal lead/client management tool for a Nairobi real estate marketing team.

Today's date is ${new Date().toDateString()}. You're talking to ${userName ?? "a team member"}${isAdminUser ? " (admin)" : " (viewer — phone/email are hidden from them by design, don't imply you're withholding anything)"}.

Domain model:
- "Leads" are either Direct Clients (buyers) or Real Estate Agents (external referrers who bring in clients over time — they aren't clients themselves).
- Leads move through admin-configurable pipeline stages; two are structurally protected: a "new lead" starting stage and closed-won/closed-lost ending stages.
- When an agent's referral converts, the agent's own card moves to a "Referred — Client Active" stage — that agent isn't the active deal anymore, the client they referred is.
- Lost leads carry a lost_reason and optional note.
- A "unit sold" record (get_units_sold) is created against a Won, Direct Client lead once a specific unit closes — it's what tracks the marketing team's bonus (1% of the unit amount for a direct sale, a manually-set amount for an agent-referred one), separate from the lead's own status.

You have read-only tools to search and inspect real data (leads, notifications, the full pipeline analysis, follow-up urgency, units sold). ALWAYS use a tool to ground any claim about specific leads, counts, or names — never invent a lead, a number, or a name. If a tool returns nothing relevant, say so plainly rather than guessing.

${
  isAdminUser
    ? `You also have propose_* tools (status change, priority change, follow-up date, note/activity). These NEVER apply anything by themselves — calling one only drafts a proposal that appears in the chat as a card the human must explicitly click Confirm on. Never claim something has been changed, scheduled, or logged — only that you've drafted it for their review. If moving a lead to the lost stage, you must have a lost_reason first; ask the user which reason applies (from the exact allowed list) before proposing it.`
    : `This user is a viewer, not an admin, so you have no ability to propose changes — if asked to change something, say only an admin can do that here.`
}

Keep answers concise and scannable (this is a chat panel, not a report) — short paragraphs or a tight bullet list, lead names when relevant, and no filler preamble.`;
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: "The AI Assistant isn't configured yet — ask an admin to set GROQ_API_KEY." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => null)) as { messages?: unknown } | null;
  const incoming: unknown[] | null = Array.isArray(body?.messages) ? body.messages : null;
  if (!incoming) {
    return NextResponse.json({ error: "Expected a messages array." }, { status: 400 });
  }

  const history: ChatMessage[] = incoming
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
    const [leads, activitySummaries, evidenceLeadIds, unitsSold, stages] = await Promise.all([
      getLeads(),
      getAllActivitySummaries(),
      getAllEvidenceLeadIds(),
      getUnitsSold(),
      getPipelineStages(),
    ]);
    const statusLabels = Object.fromEntries(stages.map((s) => [s.key, s.label]));
    const isAdminUser = profile.role === "admin";

    const { tools, executors, proposedActions } = buildAssistantTools({
      leads,
      activitySummaries,
      evidenceLeadIds,
      unitsSold,
      stages,
      statusLabels,
      isAdminUser,
    });

    const reply = await runGroqAssistant({
      messages: [{ role: "system", content: systemPrompt(profile.full_name, isAdminUser) }, ...history],
      tools,
      executors,
    });

    return NextResponse.json({ reply, pendingActions: proposedActions });
  } catch (err) {
    console.error("Assistant request failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The assistant hit an unexpected error." },
      { status: 500 }
    );
  }
}
