import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEAD_SELECT, type LeadWithRelations } from "@/lib/queries/leads";
import type { ReminderWithLeadName } from "@/lib/queries/reminders";
import { groupFollowUps } from "@/lib/follow-ups";
import { partitionReminders } from "@/lib/orion";
import { fullName } from "@/lib/format";
import { sendMail } from "@/lib/mailer";
import { renderReminderEmail, type DigestRow } from "@/lib/reminder-email";

const TZ = "Africa/Nairobi";
const LIST_LIMIT = 10;

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The 9am morning email while Ask Orion is paused: reminders due, follow-ups
 * overdue / due today, and reminders coming up this week — sent only to
 * active users who switched on "Morning email" in their own profile
 * (profiles.email_updates). Reminders included in a sent email are marked
 * notified so they don't repeat, matching the AI digest's behaviour.
 */
export async function runReminderDigest(appUrl: string) {
  const supabase = createAdminClient();
  const now = new Date();
  const windowTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Recipients first, and select("*") rather than naming email_updates, so
  // until the opt-in migration has run this exits cleanly with "nobody
  // opted in" instead of erroring every morning.
  const profilesRes = await supabase.from("profiles").select("*").eq("is_active", true);
  if (profilesRes.error) throw new Error(profilesRes.error.message);

  const recipients = (profilesRes.data ?? [])
    .filter((p) => (p as { email_updates?: boolean }).email_updates === true)
    .map((p) => ({
      email: p.notification_email || p.email,
      name: p.display_name || p.full_name?.split(" ")[0] || "there",
    }))
    .filter((r): r is { email: string; name: string } => !!r.email);

  if (recipients.length === 0) {
    return { skipped: "Nobody has switched on the morning email yet." };
  }

  const [leadsRes, remindersRes, stagesRes] = await Promise.all([
    supabase.from("leads").select(LEAD_SELECT),
    supabase
      .from("lead_reminders")
      .select("*, lead:leads(first_name, last_name)")
      .is("notified_at", null)
      .lte("remind_at", windowTo)
      .order("remind_at", { ascending: true }),
    supabase.from("pipeline_stages").select("key, label"),
  ]);
  for (const res of [leadsRes, remindersRes, stagesRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  const stageLabel = new Map((stagesRes.data ?? []).map((s) => [s.key, s.label]));
  const reminders: ReminderWithLeadName[] = (remindersRes.data ?? []).map((r) => {
    const { lead, ...rest } = r as typeof r & { lead: { first_name: string; last_name: string } | null };
    return { ...rest, lead_name: lead ? `${lead.first_name} ${lead.last_name}`.trim() : "Unknown lead" };
  });
  const { due, upcoming } = partitionReminders(reminders, now);
  const leads = (leadsRes.data ?? []) as unknown as LeadWithRelations[];
  const { overdue, dueToday } = groupFollowUps(leads, now);

  if (due.length + upcoming.length + overdue.length + dueToday.length === 0) {
    return { skipped: "Nothing due or coming up — no email needed today." };
  }

  const reminderRow = (r: ReminderWithLeadName): DigestRow => ({
    title: r.title,
    detail: r.lead_name,
    when: when(r.remind_at),
  });
  const followUpRow = (l: LeadWithRelations): DigestRow => ({
    title: fullName(l),
    detail: [stageLabel.get(l.status) ?? l.status, l.assigned_agent?.name].filter(Boolean).join(" · "),
    when: when(l.next_follow_up_at!),
  });

  const dateLabel = now.toLocaleDateString("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const results = await Promise.all(
    recipients.map((r) =>
      sendMail({
        to: r.email,
        subject: `Your morning summary · ${dateLabel}`,
        html: renderReminderEmail({
          greetingName: r.name,
          dateLabel,
          appUrl,
          remindersDue: due.map(reminderRow),
          followUpsOverdue: overdue.map(followUpRow),
          followUpsToday: dueToday.map(followUpRow),
          comingUp: upcoming.map(reminderRow),
          limit: LIST_LIMIT,
        }),
      })
    )
  );

  const failed = results.filter((r) => r.error);
  if (failed.length === results.length) {
    throw new Error(failed[0]?.error ?? "All sends failed.");
  }

  if (due.length > 0) {
    const { error } = await supabase
      .from("lead_reminders")
      .update({ notified_at: now.toISOString() })
      .in("id", due.map((r) => r.id));
    if (error) console.error("Failed to mark reminders as notified:", error.message);
  }

  return { sent: results.length - failed.length, failed: failed.length, remindersNotified: due.length };
}
