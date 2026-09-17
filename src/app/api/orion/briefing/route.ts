import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getLeads } from "@/lib/queries/leads";
import { getAllActivitySummaries } from "@/lib/queries/activities";
import { getAllEvidenceLeadIds } from "@/lib/queries/evidence";
import { getUnitsSold } from "@/lib/queries/units-sold";
import { getPipelineStages } from "@/lib/queries/settings";
import { getRemindersInWindow } from "@/lib/queries/reminders";
import { getOrionBusinessContextForRequest } from "@/lib/queries/orion-context";
import { runClaudeNarration } from "@/lib/claude";
import { orionSystemPrompt, buildPortfolioContext, briefingPrompt, parseBriefing } from "@/lib/orion";

export type { OrionBriefing, OrionBriefingItem } from "@/lib/orion";

export async function GET() {
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

  try {
    const now = new Date();
    const windowFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const windowTo = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const [leads, activitySummaries, evidenceLeadIds, unitsSold, stages, reminders, businessContext] =
      await Promise.all([
        getLeads(),
        getAllActivitySummaries(),
        getAllEvidenceLeadIds(),
        getUnitsSold(),
        getPipelineStages(),
        getRemindersInWindow(windowFrom, windowTo),
        getOrionBusinessContextForRequest().catch(() => ""),
      ]);
    const statusLabels = Object.fromEntries(stages.map((s) => [s.key, s.label]));

    const context = buildPortfolioContext({
      leads,
      activitySummaries,
      evidenceLeadIds,
      unitsSold,
      stages,
      statusLabels,
      reminders,
    });

    const raw = await runClaudeNarration({
      system: orionSystemPrompt(businessContext),
      prompt: briefingPrompt("page") + context,
      maxTokens: 4000,
    });

    const briefing = parseBriefing(raw, leads);
    return NextResponse.json(briefing);
  } catch (err) {
    console.error("Orion briefing failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Orion hit an unexpected error." },
      { status: 500 }
    );
  }
}
