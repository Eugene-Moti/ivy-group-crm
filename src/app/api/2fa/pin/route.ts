import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { require2faSession } from "@/lib/auth-2fa/guard";
import { grant2fa, is2faVerified } from "@/lib/auth-2fa/verified";
import { log2fa } from "@/lib/auth-2fa/audit";
import { withJson } from "@/lib/private/route-helpers";
import {
  hashPin,
  verifyPin,
  isValidPinFormat,
  MAX_PIN_ATTEMPTS,
  PIN_LOCKOUT_MINUTES,
} from "@/lib/private/pin";

/** Set the PIN fallback (during enrolment, or changing it). Also clears 2FA for this session. */
export const POST = withJson(async (request: Request) => {
  const s = await require2faSession();
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const newPin = body?.newPin;
  const currentPin = typeof body?.currentPin === "string" ? body.currentPin : "";
  if (!isValidPinFormat(newPin)) {
    return NextResponse.json({ error: "PIN must be 6–12 digits." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("auth_2fa_pin")
    .select("pin_hash")
    .eq("user_id", s.userId)
    .maybeSingle();

  if (existing?.pin_hash) {
    const verified = await is2faVerified(s.userId, s.sessionId);
    if (!verified && !verifyPin(currentPin, existing.pin_hash)) {
      return NextResponse.json({ error: "Current PIN is incorrect." }, { status: 403 });
    }
  }

  const { error } = await supabase.from("auth_2fa_pin").upsert({
    user_id: s.userId,
    pin_hash: hashPin(newPin),
    pin_set_at: new Date().toISOString(),
    failed_attempts: 0,
    locked_until: null,
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await grant2fa(s.userId, s.sessionId);
  await log2fa("enrolled_pin");
  return NextResponse.json({ ok: true });
});

/** Verify the PIN → clear 2FA for this session, with lockout after repeated failures. */
export const PUT = withJson(async (request: Request) => {
  const s = await require2faSession();
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const pin = typeof body?.pin === "string" ? body.pin : "";

  const supabase = await createClient();
  const { data: cred } = await supabase
    .from("auth_2fa_pin")
    .select("pin_hash, failed_attempts, locked_until")
    .eq("user_id", s.userId)
    .maybeSingle();

  if (!cred?.pin_hash) return NextResponse.json({ error: "No PIN set." }, { status: 400 });

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
      .from("auth_2fa_pin")
      .update({
        failed_attempts: lock ? 0 : attempts,
        locked_until: lock
          ? new Date(Date.now() + PIN_LOCKOUT_MINUTES * 60000).toISOString()
          : null,
      })
      .eq("user_id", s.userId);
    await log2fa("verify_failed", { detail: { method: "pin", attempts } });
    return NextResponse.json(
      {
        error: lock
          ? `Too many attempts — locked for ${PIN_LOCKOUT_MINUTES} minutes.`
          : `Incorrect PIN. ${MAX_PIN_ATTEMPTS - attempts} left.`,
      },
      { status: 403 }
    );
  }

  await supabase
    .from("auth_2fa_pin")
    .update({ failed_attempts: 0, locked_until: null })
    .eq("user_id", s.userId);

  await grant2fa(s.userId, s.sessionId);
  await log2fa("verified_pin");
  return NextResponse.json({ ok: true });
});
