import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePrivateProfile } from "@/lib/private/access";
import { isUnlocked } from "@/lib/private/unlock";
import { logPrivate } from "@/lib/private/audit";
import { withJson } from "@/lib/private/route-helpers";

/** What the current user has set up: PIN yes/no, and their registered devices. */
export const GET = withJson(async () => {
  const gate = await requirePrivateProfile();
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const [{ data: pinRow }, { data: devices }] = await Promise.all([
    supabase
      .from("private_area_credentials")
      .select("pin_set_at")
      .eq("user_id", gate.profile.id)
      .maybeSingle(),
    supabase
      .from("private_webauthn_credentials")
      .select("credential_id, device_label, created_at, last_used_at")
      .eq("user_id", gate.profile.id)
      .order("created_at"),
  ]);

  return NextResponse.json({
    pinSet: !!pinRow?.pin_set_at,
    devices: devices ?? [],
  });
});

/** Remove one registered device. Requires an active unlock (you're already inside). */
export const DELETE = withJson(async (request: Request) => {
  const gate = await requirePrivateProfile();
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!(await isUnlocked(gate.profile.id))) {
    return NextResponse.json({ error: "Unlock the private area first." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const credentialId = typeof body?.credentialId === "string" ? body.credentialId : "";
  if (!credentialId) return NextResponse.json({ error: "Missing credentialId" }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase
    .from("private_webauthn_credentials")
    .delete()
    .eq("user_id", gate.profile.id)
    .eq("credential_id", credentialId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logPrivate("biometric_removed");
  return NextResponse.json({ ok: true });
});
