import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { require2faSession } from "@/lib/auth-2fa/guard";
import { is2faVerified } from "@/lib/auth-2fa/verified";
import { getMy2faStatus } from "@/lib/auth-2fa/status";
import { log2fa } from "@/lib/auth-2fa/audit";
import { withJson } from "@/lib/private/route-helpers";

export const GET = withJson(async () => {
  const s = await require2faSession();
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json(await getMy2faStatus());
});

/** Remove one of your own factors. Requires a verified session, and never the last one. */
export const DELETE = withJson(async (request: Request) => {
  const s = await require2faSession();
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await is2faVerified(s.userId, s.sessionId))) {
    return NextResponse.json({ error: "Verify your identity first." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const kind = body?.kind;
  const credentialId = typeof body?.credentialId === "string" ? body.credentialId : "";

  const status = await getMy2faStatus();
  const factorCount = status.devices.length + (status.pinSet ? 1 : 0);
  if (factorCount <= 1) {
    return NextResponse.json(
      { error: "You can't remove your only second factor — add another first." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  if (kind === "pin") {
    const { error } = await supabase.from("auth_2fa_pin").delete().eq("user_id", s.userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await log2fa("pin_removed");
  } else if (kind === "passkey" && credentialId) {
    const { error } = await supabase
      .from("auth_2fa_webauthn")
      .delete()
      .eq("user_id", s.userId)
      .eq("credential_id", credentialId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await log2fa("device_removed");
  } else {
    return NextResponse.json({ error: "Nothing to remove." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
});
