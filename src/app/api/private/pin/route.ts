import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePrivateProfile } from "@/lib/private/access";
import { grantUnlock, isUnlocked } from "@/lib/private/unlock";
import { logPrivate } from "@/lib/private/audit";
import {
  hashPin,
  verifyPin,
  isValidPinFormat,
  MAX_PIN_ATTEMPTS,
  PIN_LOCKOUT_MINUTES,
} from "@/lib/private/pin";
import { withJson } from "@/lib/private/route-helpers";

/** Set or change the PIN. Changing an existing one needs the old PIN or an active unlock. */
export const POST = withJson(async (request: Request) => {
  const gate = await requirePrivateProfile();
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const newPin = body?.newPin;
  const currentPin = typeof body?.currentPin === "string" ? body.currentPin : "";

  if (!isValidPinFormat(newPin)) {
    return NextResponse.json({ error: "PIN must be 6–12 digits." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: cred } = await supabase
    .from("private_area_credentials")
    .select("pin_hash")
    .eq("user_id", gate.profile.id)
    .maybeSingle();

  if (cred?.pin_hash) {
    const unlocked = await isUnlocked(gate.profile.id);
    if (!unlocked && !verifyPin(currentPin, cred.pin_hash)) {
      return NextResponse.json({ error: "Current PIN is incorrect." }, { status: 403 });
    }
  }

  const { error } = await supabase.from("private_area_credentials").upsert({
    user_id: gate.profile.id,
    pin_hash: hashPin(newPin),
    pin_set_at: new Date().toISOString(),
    failed_attempts: 0,
    locked_until: null,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logPrivate("pin_set");
  return NextResponse.json({ ok: true });
});

/** Verify the PIN and grant a 15-minute unlock, with lockout after repeated failures. */
export const PUT = withJson(async (request: Request) => {
  const gate = await requirePrivateProfile();
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin : "";

  const supabase = await createClient();
  const { data: cred } = await supabase
    .from("private_area_credentials")
    .select("pin_hash, failed_attempts, locked_until")
    .eq("user_id", gate.profile.id)
    .maybeSingle();

  if (!cred?.pin_hash) {
    return NextResponse.json({ error: "No PIN set yet." }, { status: 400 });
  }

  if (cred.locked_until && new Date(cred.locked_until) > new Date()) {
    const mins = Math.ceil((new Date(cred.locked_until).getTime() - Date.now()) / 60000);
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` },
      { status: 429 }
    );
  }

  if (!verifyPin(pin, cred.pin_hash)) {
    const attempts = (cred.failed_attempts ?? 0) + 1;
    const lock = attempts >= MAX_PIN_ATTEMPTS;
    await supabase
      .from("private_area_credentials")
      .update({
        failed_attempts: lock ? 0 : attempts,
        locked_until: lock
          ? new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60000).toISOString()
          : null,
      })
      .eq("user_id", gate.profile.id);
    await logPrivate("unlock_failed", { detail: { method: "pin", attempts } });
    return NextResponse.json(
      {
        error: lock
          ? `Too many attempts — locked for ${PIN_LOCKOUT_MINUTES} minutes.`
          : `Incorrect PIN. ${MAX_PIN_ATTEMPTS - attempts} attempt${
              MAX_PIN_ATTEMPTS - attempts === 1 ? "" : "s"
            } left.`,
      },
      { status: 403 }
    );
  }

  await supabase
    .from("private_area_credentials")
    .update({ failed_attempts: 0, locked_until: null })
    .eq("user_id", gate.profile.id);

  await grantUnlock(gate.profile.id);
  await logPrivate("unlock_pin");
  return NextResponse.json({ ok: true });
});
