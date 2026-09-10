import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type TwoFaAction =
  | "enrolled_passkey"
  | "enrolled_pin"
  | "verified_passkey"
  | "verified_pin"
  | "verify_failed"
  | "device_removed"
  | "pin_removed"
  | "admin_reset";

/**
 * Append-only 2FA event log. `asUserId` lets an admin-reset (which runs on
 * the service-role client) attribute the row to the affected user rather
 * than nobody.
 */
export async function log2fa(
  action: TwoFaAction,
  opts: { detail?: Record<string, unknown>; asUserId?: string } = {}
): Promise<void> {
  try {
    if (opts.asUserId) {
      await createAdminClient().from("auth_2fa_log").insert({
        user_id: opts.asUserId,
        action,
        detail: (opts.detail ?? null) as never,
      });
      return;
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("auth_2fa_log").insert({
      user_id: user?.id ?? null,
      action,
      detail: (opts.detail ?? null) as never,
    });
  } catch (err) {
    console.error("2FA audit log failed:", err);
  }
}
