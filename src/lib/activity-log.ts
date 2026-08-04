import type { createClient } from "@/lib/supabase/client";
import type { LeadStatus } from "@/lib/constants";

/**
 * Logs a status_change activity, mirroring what the Kanban board records on
 * drag-and-drop — kept as a shared helper so every path that can change a
 * lead's status (Kanban, the edit form) produces the same activity trail,
 * which pipeline-velocity reporting depends on.
 */
export async function logStatusChange(
  supabase: ReturnType<typeof createClient>,
  leadId: string,
  previousStatus: LeadStatus,
  newStatus: LeadStatus,
  userId: string | null
) {
  if (previousStatus === newStatus) return;
  await supabase.from("activities").insert({
    lead_id: leadId,
    type: "status_change",
    body: `Status changed from ${previousStatus} to ${newStatus}.`,
    created_by: userId,
  });
}
