import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { require2faSession } from "@/lib/auth-2fa/guard";
import { log2fa } from "@/lib/auth-2fa/audit";
import { withJson } from "@/lib/private/route-helpers";

/**
 * Admin-only: clear a user's PIN so their next sign-in forces setting a new
 * one. There's no email/passkey fallback with PIN-only 2FA, so this is the
 * one escape hatch for someone locked out or who's forgotten it.
 */
export const POST = withJson(async (request: Request) => {
  const s = await require2faSession();
  if (!s || !s.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("auth_2fa_pin").delete().eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await log2fa("admin_reset", { asUserId: userId, detail: { by: s.userId } });
  return NextResponse.json({ ok: true });
});
