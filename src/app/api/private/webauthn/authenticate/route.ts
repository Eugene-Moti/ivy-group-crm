import { NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import { requirePrivateProfile } from "@/lib/private/access";
import { getRpConfig, stashChallenge, readChallenge, clearChallenge } from "@/lib/private/webauthn";
import { grantUnlock } from "@/lib/private/unlock";
import { logPrivate } from "@/lib/private/audit";
import { withJson } from "@/lib/private/route-helpers";

/** Step 1 — challenge for an existing registered device. */
export const GET = withJson(async () => {
  const gate = await requirePrivateProfile();
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rpID } = await getRpConfig();
  const supabase = await createClient();
  const { data: creds } = await supabase
    .from("private_webauthn_credentials")
    .select("credential_id, transports")
    .eq("user_id", gate.profile.id);

  if (!creds || creds.length === 0) {
    return NextResponse.json({ error: "No device registered yet." }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: creds.map((c) => ({
      id: c.credential_id,
      transports: (c.transports ?? undefined) as
        | ("ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb")[]
        | undefined,
    })),
  });

  await stashChallenge("auth", options.challenge);
  return NextResponse.json(options);
});

/** Step 2 — verify the assertion, then grant a 15-minute unlock. */
export const POST = withJson(async (request: Request) => {
  const gate = await requirePrivateProfile();
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const assertion = body?.assertion;
  if (!assertion?.id) return NextResponse.json({ error: "Missing assertion" }, { status: 400 });

  const expectedChallenge = await readChallenge("auth");
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge expired — try again." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: cred } = await supabase
    .from("private_webauthn_credentials")
    .select("credential_id, public_key, counter")
    .eq("user_id", gate.profile.id)
    .eq("credential_id", assertion.id)
    .maybeSingle();

  if (!cred) {
    await logPrivate("unlock_failed", { detail: { method: "biometric", reason: "unknown credential" } });
    return NextResponse.json({ error: "Unrecognised device." }, { status: 400 });
  }

  const { rpID, origin } = await getRpConfig();
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: assertion,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: cred.credential_id,
        publicKey: new Uint8Array(Buffer.from(cred.public_key, "base64url")),
        counter: Number(cred.counter),
      },
    });
  } catch (err) {
    await clearChallenge();
    await logPrivate("unlock_failed", { detail: { method: "biometric" } });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 400 }
    );
  }
  await clearChallenge();

  if (!verification.verified) {
    await logPrivate("unlock_failed", { detail: { method: "biometric" } });
    return NextResponse.json({ error: "Verification failed." }, { status: 400 });
  }

  await supabase
    .from("private_webauthn_credentials")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("credential_id", cred.credential_id);

  await grantUnlock(gate.profile.id);
  await logPrivate("unlock_biometric");
  return NextResponse.json({ ok: true });
});
