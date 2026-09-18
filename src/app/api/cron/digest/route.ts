import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEAD_SELECT, type LeadWithRelations } from "@/lib/queries/leads";
import type { UnitSoldRow } from "@/lib/queries/units-sold";
import type { ReminderWithLeadName } from "@/lib/queries/reminders";
import { getOrionBusinessContext } from "@/lib/queries/orion-context";
import { runClaudeStructured } from "@/lib/claude";
import {
  orionSystemPrompt,
  buildPortfolioContext,
  briefingPrompt,
  finalizeBriefing,
  partitionReminders,
  OrionBriefingSchema,
} from "@/lib/orion";
import { renderDigestEmail } from "@/lib/digest-email";
import { generateOrionBriefingPdfBuffer } from "@/lib/orion-briefing-pdf-server";
import { sendMail } from "@/lib/mailer";

// Opus 5 at effort "high" with adaptive thinking and a 16k-token structured
// output, plus PDF generation and sending to every admin, can genuinely
// take longer than the platform's default function timeout — this is the
// max the Vercel Hobby plan allows. Vercel Cron itself also has its own
// per-invocation timeout that scales with the plan.
export const maxDuration = 60;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 503 });
  }
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return NextResponse.json({ error: "SMTP_HOST, SMTP_USER, and SMTP_PASS are not configured." }, { status: 503 });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date();
    // No lower bound: notified_at is what stops a reminder from being
    // re-sent, not a date window — that's the fix for a reminder created
    // after today's digest had already run, for later the same day, which
    // used to fall between "due today" and "upcoming" forever.
    const windowTo = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const [leadsRes, activitiesRes, evidenceRes, unitsSoldRes, stagesRes, profilesRes, remindersRes, businessContext] =
      await Promise.all([
        supabase.from("leads").select(LEAD_SELECT).order("created_at", { ascending: false }),
        supabase.from("activities").select("lead_id, type, created_at, body"),
        supabase.from("lead_evidence").select("lead_id"),
        supabase.from("units_sold").select("*").order("sold_at", { ascending: false }),
        supabase.from("pipeline_stages").select("*").order("sort_order"),
        supabase.from("profiles").select("email, notification_email, full_name, display_name").eq("role", "admin"),
        supabase
          .from("lead_reminders")
          .select("*, lead:leads(first_name, last_name)")
          .is("notified_at", null)
          .lte("remind_at", windowTo)
          .order("remind_at", { ascending: true }),
        getOrionBusinessContext(supabase).catch(() => ""),
      ]);

    for (const res of [leadsRes, activitiesRes, evidenceRes, unitsSoldRes, stagesRes, profilesRes, remindersRes]) {
      if (res.error) throw new Error(res.error.message);
    }

    const leads = (leadsRes.data ?? []) as unknown as LeadWithRelations[];
    const activitySummaries = activitiesRes.data ?? [];
    const evidenceLeadIds = evidenceRes.data ?? [];
    const unitsSold = (unitsSoldRes.data ?? []) as UnitSoldRow[];
    const stages = stagesRes.data ?? [];
    const statusLabels = Object.fromEntries(stages.map((s) => [s.key, s.label]));
    const reminders: ReminderWithLeadName[] = (remindersRes.data ?? []).map((r) => {
      const { lead, ...rest } = r as typeof r & { lead: { first_name: string; last_name: string } | null };
      return { ...rest, lead_name: lead ? `${lead.first_name} ${lead.last_name}`.trim() : "Unknown lead" };
    });

    const recipients = (profilesRes.data ?? [])
      .map((p) => ({
        email: p.notification_email || p.email,
        name: p.display_name || p.full_name?.split(" ")[0] || "there",
      }))
      .filter((r): r is { email: string; name: string } => !!r.email);

    if (recipients.length === 0) {
      return NextResponse.json({ skipped: "No admin has a notification email on file." });
    }

    const context = buildPortfolioContext({
      leads,
      activitySummaries,
      evidenceLeadIds,
      unitsSold,
      stages,
      statusLabels,
      reminders,
    });

    const raw = await runClaudeStructured({
      system: orionSystemPrompt(businessContext),
      prompt: briefingPrompt("email") + context,
      schema: OrionBriefingSchema,
    });

    const briefing = finalizeBriefing(raw, leads);

    const today = new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateOrionBriefingPdfBuffer({ briefing, generatedByName: null });
    } catch (err) {
      console.error("Orion briefing PDF generation failed, sending without attachment:", err);
    }

    const results = await Promise.all(
      recipients.map((r) =>
        sendMail({
          to: r.email,
          subject: `Orion's Daily Briefing — ${today}`,
          html: renderDigestEmail({
            greetingName: r.name,
            subtitle: today,
            briefing,
            hasAttachment: !!pdfBuffer,
          }),
          attachments: pdfBuffer
            ? [
                {
                  filename: `orion-daily-briefing-${new Date().toISOString().slice(0, 10)}.pdf`,
                  content: pdfBuffer,
                  contentType: "application/pdf",
                },
              ]
            : undefined,
        })
      )
    );

    const failed = results.filter((r) => r.error);
    if (failed.length === results.length) {
      throw new Error(failed[0]?.error ?? "All sends failed.");
    }

    // At least one admin got the email — mark every reminder that was due
    // (today or overdue, per partitionReminders) as notified so it doesn't
    // repeat tomorrow. Reminders still in the future stay unmarked; they'll
    // move into this bucket and get sent once their date arrives.
    const { due: sentReminders } = partitionReminders(reminders, now);
    if (sentReminders.length > 0) {
      const { error: notifyError } = await supabase
        .from("lead_reminders")
        .update({ notified_at: now.toISOString() })
        .in("id", sentReminders.map((r) => r.id));
      if (notifyError) {
        console.error("Failed to mark reminders as notified:", notifyError.message);
      }
    }

    return NextResponse.json({
      sent: results.length - failed.length,
      failed: failed.length,
      recipients: recipients.length,
      remindersNotified: sentReminders.length,
    });
  } catch (err) {
    console.error("Digest cron failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "The digest job hit an unexpected error." },
      { status: 500 }
    );
  }
}
