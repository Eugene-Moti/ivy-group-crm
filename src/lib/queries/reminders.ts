import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type LeadReminderRow = Database["public"]["Tables"]["lead_reminders"]["Row"];

export type LeadReminderWithAuthor = LeadReminderRow & {
  author: { id: string; full_name: string | null } | null;
};

export async function getUpcomingReminders(leadId: string): Promise<LeadReminderWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_reminders")
    .select("*, author:profiles!lead_reminders_created_by_fkey(id, full_name)")
    .eq("lead_id", leadId)
    .order("remind_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LeadReminderWithAuthor[];
}

export type ReminderWithLeadName = LeadReminderRow & { lead_name: string };

/** Every reminder whose remind_at falls within [from, to] — used to build Orion's context for the briefing and the daily digest, not for the live lead-detail view. */
export async function getRemindersInWindow(from: string, to: string): Promise<ReminderWithLeadName[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_reminders")
    .select("*, lead:leads(first_name, last_name)")
    .gte("remind_at", from)
    .lte("remind_at", to)
    .order("remind_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const { lead, ...rest } = r as LeadReminderRow & { lead: { first_name: string; last_name: string } | null };
    return { ...rest, lead_name: lead ? `${lead.first_name} ${lead.last_name}`.trim() : "Unknown lead" };
  });
}
