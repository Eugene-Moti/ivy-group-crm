import "server-only";
import { createClient } from "@/lib/supabase/server";

export type PrivateAuditAction =
  | "unlock_biometric"
  | "unlock_pin"
  | "unlock_failed"
  | "lock"
  | "view_client"
  | "create_client"
  | "update_client"
  | "move_in"
  | "move_out"
  | "pin_set"
  | "biometric_registered"
  | "biometric_removed"
  | "access_granted"
  | "access_revoked";

/**
 * Append-only record of everything that happens in the private area. Uses
 * the RLS-scoped client — the insert policy only lets a user log rows as
 * themselves, and only the owner can read the log back.
 */
export async function logPrivate(
  action: PrivateAuditAction,
  opts: { leadId?: string | null; detail?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("private_access_log").insert({
      user_id: user?.id ?? null,
      lead_id: opts.leadId ?? null,
      action,
      detail: (opts.detail ?? null) as never,
    });
  } catch (err) {
    // Logging must never break the action it's recording.
    console.error("private audit log failed:", err);
  }
}
