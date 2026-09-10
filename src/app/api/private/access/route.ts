import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPrivateAccess } from "@/lib/private/access";
import { getCurrentProfile } from "@/lib/auth";
import { isUnlocked } from "@/lib/private/unlock";
import { logPrivate } from "@/lib/private/audit";
import { withJson } from "@/lib/private/route-helpers";

/** Owner-only: add someone to the private allowlist. */
export const POST = withJson(async (request: Request) => {
  const [profile, access] = await Promise.all([getCurrentProfile(), getPrivateAccess()]);
  if (!profile || !access.isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await isUnlocked(profile.id))) {
    return NextResponse.json({ error: "Unlock the private area first." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("private_lead_access")
    .insert({ user_id: userId, granted_by: profile.id });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logPrivate("access_granted", { detail: { userId } });
  return NextResponse.json({ ok: true });
});

/** Owner-only: remove someone from the allowlist (the owner row is trigger-protected). */
export const DELETE = withJson(async (request: Request) => {
  const [profile, access] = await Promise.all([getCurrentProfile(), getPrivateAccess()]);
  if (!profile || !access.isOwner) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await isUnlocked(profile.id))) {
    return NextResponse.json({ error: "Unlock the private area first." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("private_lead_access").delete().eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logPrivate("access_revoked", { detail: { userId } });
  return NextResponse.json({ ok: true });
});
