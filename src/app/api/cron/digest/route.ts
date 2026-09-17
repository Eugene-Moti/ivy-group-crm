import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEAD_SELECT, type LeadWithRelations } from "@/lib/queries/leads";
import type { UnitSoldRow } from "@/lib/queries/units-sold";
import { runClaudeNarration } from "@/lib/claude";
import { ORION_PERSONA, buildPortfolioContext } from "@/lib/orion";
import { renderDigestEmail } from "@/lib/digest-email";

const DIGEST_PROMPT = `You are writing today's automated Daily Briefing email for the admins of Ivy Group CRM — this lands in their inbox once a day. Below is the full, already-computed state of the pipeline as JSON: KPIs, breakdowns, deterministic insights, the current "needs attention" list, and recent unit sales. Read it, then write the complete briefing in a single reply (this is one-shot, there's no follow-up turn).

Structure the briefing as:
- A one-line headline sense of where things stand today.
- "Needs attention" — the most urgent items (overdue follow-ups, Hot leads gone quiet, Won leads without a recorded unit sale, any agent incorrectly marked Won), as a short bullet list. Name specific leads where it helps, but don't dump a huge list — mention counts and the 2-3 most important individually.
- "Snapshot" — a couple of the most notable numbers from the full analysis (conversion rate, notable trend, a standout manager/source).
- One short closing suggestion for what to prioritize today.

Keep it tight — this is an email someone reads in under a minute, not a report. Use "-" for bullet lists. No filler preamble, no sign-off, no subject line (that's handled separately). Never invent a lead, a number, or a name — everything you say must trace back to the data below.

DATA:
`;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 503 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY is not configured." }, { status: 503 });
  }

  try {
    const supabase = createAdminClient();

    const [leadsRes, activitiesRes, evidenceRes, unitsSoldRes, stagesRes, profilesRes] = await Promise.all([
      supabase.from("leads").select(LEAD_SELECT).order("created_at", { ascending: false }),
      supabase.from("activities").select("lead_id, type, created_at, body"),
      supabase.from("lead_evidence").select("lead_id"),
      supabase.from("units_sold").select("*").order("sold_at", { ascending: false }),
      supabase.from("pipeline_stages").select("*").order("sort_order"),
      supabase.from("profiles").select("email").eq("role", "admin"),
    ]);

    for (const res of [leadsRes, activitiesRes, evidenceRes, unitsSoldRes, stagesRes, profilesRes]) {
      if (res.error) throw new Error(res.error.message);
    }

    const leads = (leadsRes.data ?? []) as unknown as LeadWithRelations[];
    const activitySummaries = activitiesRes.data ?? [];
    const evidenceLeadIds = evidenceRes.data ?? [];
    const unitsSold = (unitsSoldRes.data ?? []) as UnitSoldRow[];
    const stages = stagesRes.data ?? [];
    const statusLabels = Object.fromEntries(stages.map((s) => [s.key, s.label]));

    const recipients = (profilesRes.data ?? [])
      .map((p) => p.email)
      .filter((e): e is string => !!e);

    if (recipients.length === 0) {
      return NextResponse.json({ skipped: "No admin has an email on file." });
    }

    const context = buildPortfolioContext({
      leads,
      activitySummaries,
      evidenceLeadIds,
      unitsSold,
      stages,
      statusLabels,
    });

    const briefing = await runClaudeNarration({
      system: ORION_PERSONA,
      prompt: DIGEST_PROMPT + context,
      maxTokens: 2000,
    });

    const today = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: sendError } = await resend.emails.send({
      from: process.env.DIGEST_FROM_EMAIL || "Ivy Group CRM <onboarding@resend.dev>",
      to: recipients,
      subject: `Orion's Daily Briefing — ${today}`,
      html: renderDigestEmail({
        title: "Orion's Daily Briefing",
        subtitle: today,
        body: briefing,
      }),
    });

    if (sendError) {
      throw new Error(sendError.message);
    }

    return NextResponse.json({ sent: true, recipients: recipients.length });
  } catch (err) {
    console.error("Digest cron failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The digest job hit an unexpected error." },
      { status: 500 }
    );
  }
}
