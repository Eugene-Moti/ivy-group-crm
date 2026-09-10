import { NextResponse } from "next/server";
import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import { require2faSession } from "@/lib/auth-2fa/guard";
import { getRpConfig, stashChallenge, readChallenge, clearChallenge } from "@/lib/auth-2fa/webauthn";
import { grant2fa } from "@/lib/auth-2fa/verified";
import { log2fa } from "@/lib/auth-2fa/audit";
import { withJson } from "@/lib/private/route-helpers";

type Transport = "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb";

/** Step 1 — registration challenge for this device's platform authenticator. */
export const GET = withJson(async () => {
  const s = await require2faSession();
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { rpID, rpName } = await getRpConfig();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("auth_2fa_webauthn")
    .select("credential_id, transports")
    .eq("user_id", s.userId);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: s.email ?? s.userId,
    userID: new TextEncoder().encode(s.userId),
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((c) => ({
      id: c.credential_id,
      transports: (c.transports ?? undefined) as Transport[] | undefined,
    })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      userVerification: "required",
    },
  });

  await stashChallenge(options.challenge);
  return NextResponse.json(options);
});

/** Step 2 — verify, store the credential, and clear the second factor for this session. */
export const POST = withJson(async (request: Request) => {
  const s = await require2faSession();
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const attestation = body?.attestation;
  const deviceLabel =
    typeof body?.deviceLabel === "string" ? body.deviceLabel.trim().slice(0, 60) || null : null;
  if (!attestation) return NextResponse.json({ error: "Missing attestation" }, { status: 400 });

  const expectedChallenge = await readChallenge();
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge expired — try again." }, { status: 400 });
  }

  const { rpID, origin } = await getRpConfig();
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: attestation,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 400 }
    );
  }
  await clearChallenge();

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Could not verify this device." }, { status: 400 });
  }

  const cred = verification.registrationInfo.credential;
  const supabase = await createClient();
  const { error } = await supabase.from("auth_2fa_webauthn").insert({
    credential_id: cred.id,
    user_id: s.userId,
    public_key: Buffer.from(cred.publicKey).toString("base64url"),
    counter: cred.counter,
    transports: cred.transports ?? null,
    device_label: deviceLabel,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await grant2fa(s.userId, s.sessionId);
  await log2fa("enrolled_passkey", { detail: { device: deviceLabel } });
  return NextResponse.json({ ok: true });
});
