import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { getLeads, type LeadWithRelations } from "@/lib/queries/leads";
import { getAllActivitySummaries } from "@/lib/queries/activities";
import { getAllEvidenceLeadIds } from "@/lib/queries/evidence";
import { getUnitsSold } from "@/lib/queries/units-sold";
import { getPipelineStages } from "@/lib/queries/settings";
import { runClaudeNarration } from "@/lib/claude";
import { ORION_PERSONA, buildPortfolioContext } from "@/lib/orion";
import { fullName } from "@/lib/format";

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

const BRIEFING_PROMPT = `You're writing the Portfolio Briefing shown at the top of your own dedicated page in the CRM — the first thing an admin sees. You're given the full, already-computed state of the pipeline below as JSON: KPIs, breakdowns by manager/project/source, deterministic insights, the current "needs attention" list (each with the exact leads behind it), recent unit sales, and a list of open leads.

Read all of it, then respond with ONLY a JSON object (no markdown fences, no commentary before or after) in exactly this shape:
{
  "headline": "1-2 sentences on overall pipeline health and momentum right now, in your own voice.",
  "items": [
    { "severity": "critical" | "warning" | "positive" | "info", "title": "short, specific", "detail": "1-2 sentences, cite real numbers/names from the data", "leadNames": ["exact lead name", "..."] }
  ],
  "recommendations": ["one concrete, specific action — who should do what", "..."]
}

Guidelines:
- 4-7 items, ordered most-important-first. Don't just restate the deterministic_insights list — synthesize across overview/by_manager/by_project/needs_attention to surface what actually matters this week, and point out anything the raw numbers hint at that a single metric wouldn't (e.g. a manager whose win rate is fine but whose pipeline is thinning).
- leadNames must be copied exactly, character-for-character, from a "name" field already present in the data — never paraphrase. Omit the field entirely if an item isn't about specific leads.
- 3-5 recommendations, concrete enough to act on today, not generic advice ("follow up more").
- Never invent a number, name, or fact not present in the data.

DATA:
`;

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
    const [leads, activitySummaries, evidenceLeadIds, unitsSold, stages] = await Promise.all([
      getLeads(),
      getAllActivitySummaries(),
      getAllEvidenceLeadIds(),
      getUnitsSold(),
      getPipelineStages(),
    ]);
    const statusLabels = Object.fromEntries(stages.map((s) => [s.key, s.label]));

    const context = buildPortfolioContext({
      leads,
      activitySummaries,
      evidenceLeadIds,
      unitsSold,
      stages,
      statusLabels,
    });

    const raw = await runClaudeNarration({
      system: ORION_PERSONA,
      prompt: BRIEFING_PROMPT + context,
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

function parseBriefing(raw: string, leads: LeadWithRelations[]): OrionBriefing {
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
