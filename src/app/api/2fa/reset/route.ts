import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { require2faSession } from "@/lib/auth-2fa/guard";
import { log2fa } from "@/lib/auth-2fa/audit";
import { withJson } from "@/lib/private/route-helpers";

/**
 * Admin-only: wipe a user's second factors. Their next sign-in forces
 * re-enrolment (password still required in the meantime). Runs on the
 * service-role client so it isn't blocked by the target user's RLS.
 */
export const POST = withJson(async (request: Request) => {
  const s = await require2faSession();
  if (!s || !s.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const admin = createAdminClient();
  const [d1, d2] = await Promise.all([
    admin.from("auth_2fa_webauthn").delete().eq("user_id", userId),
    admin.from("auth_2fa_pin").delete().eq("user_id", userId),
  ]);
  if (d1.error || d2.error) {
    return NextResponse.json({ error: d1.error?.message ?? d2.error?.message }, { status: 400 });
  }

  await log2fa("admin_reset", { asUserId: userId, detail: { by: s.userId } });
  return NextResponse.json({ ok: true });
});
