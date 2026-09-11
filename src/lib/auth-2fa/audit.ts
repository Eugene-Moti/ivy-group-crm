import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TwoFaAction = "pin_set" | "verified" | "verify_failed" | "admin_reset";

/** Append-only 2FA event log (RLS: users read their own rows, admins read all). */
export async function log2fa(
  action: TwoFaAction,
  opts: { detail?: Record<string, unknown>; asUserId?: string } = {}
): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from("auth_2fa_log").insert({
      user_id: opts.asUserId ?? user?.id ?? null,
      action,
      detail: (opts.detail ?? null) as never,
    });
  } catch (err) {
    console.error("2FA audit log failed:", err);
  }
}
