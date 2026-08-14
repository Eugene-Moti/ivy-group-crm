import type { createClient } from "@/lib/supabase/client";
import { logStatusChange } from "@/lib/activity-log";
import { CONTACT_ACTIVITY_TYPES } from "@/lib/activity";
import { LOST_STATUS_KEY, type ActivityType, type LeadPriority } from "@/lib/constants";

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Everything the AI Assistant can ever change, as a discriminated union.
 * A proposal is a plain data object — nothing is applied until the human
 * reviewing it in the chat panel clicks Confirm and one of the apply*
 * functions below actually runs. Each carries a human-readable `summary` so
 * the confirmation card never needs its own formatting logic.
 */
export type ProposedAction =
  | {
      id: string;
      kind: "status_change";
      leadId: string;
      leadName: string;
      previousStatus: string;
      newStatus: string;
      newStatusLabel: string;
      lostReason?: { reason: string; note: string };
      summary: string;
    }
  | {
      id: string;
      kind: "priority_change";
      leadId: string;
      leadName: string;
      previousPriority: string;
      newPriority: string;
      summary: string;
    }
  | {
      id: string;
      kind: "follow_up";
      leadId: string;
      leadName: string;
      nextFollowUpAt: string;
      summary: string;
    }
  | {
      id: string;
      kind: "note";
      leadId: string;
      leadName: string;
      activityType: ActivityType;
      body: string;
      summary: string;
    };

export async function applyStatusChange(
  supabase: SupabaseClient,
  action: Extract<ProposedAction, { kind: "status_change" }>,
  statusLabels: Record<string, string>,
  userId: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("leads")
    .update({
      status: action.newStatus,
      lost_reason: action.newStatus === LOST_STATUS_KEY ? (action.lostReason?.reason ?? null) : null,
      lost_reason_note: action.newStatus === LOST_STATUS_KEY ? (action.lostReason?.note || null) : null,
    })
    .eq("id", action.leadId);
  if (error) return { error: error.message };

  await logStatusChange(supabase, action.leadId, action.previousStatus, action.newStatus, statusLabels, userId);
  return { error: null };
}

export async function applyPriorityChange(
  supabase: SupabaseClient,
  action: Extract<ProposedAction, { kind: "priority_change" }>,
  userId: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("leads")
    .update({ priority: action.newPriority as LeadPriority })
    .eq("id", action.leadId);
  if (error) return { error: error.message };

  await supabase.from("activities").insert({
    lead_id: action.leadId,
    type: "note",
    body: `Priority changed from ${action.previousPriority} to ${action.newPriority} (via AI Assistant).`,
    created_by: userId,
  });
  return { error: null };
}

export async function applyFollowUp(
  supabase: SupabaseClient,
  action: Extract<ProposedAction, { kind: "follow_up" }>,
  userId: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("leads")
    .update({ next_follow_up_at: action.nextFollowUpAt })
    .eq("id", action.leadId);
  if (error) return { error: error.message };

  await supabase.from("activities").insert({
    lead_id: action.leadId,
    type: "note",
    body: `Follow-up scheduled for ${new Date(action.nextFollowUpAt).toLocaleString()} (via AI Assistant).`,
    created_by: userId,
  });
  return { error: null };
}

export async function applyNote(
  supabase: SupabaseClient,
  action: Extract<ProposedAction, { kind: "note" }>,
  userId: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase.from("activities").insert({
    lead_id: action.leadId,
    type: action.activityType,
    body: action.body,
    created_by: userId,
  });
  if (error) return { error: error.message };

  if (CONTACT_ACTIVITY_TYPES.includes(action.activityType)) {
    await supabase
      .from("leads")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", action.leadId);
  }
  return { error: null };
}
