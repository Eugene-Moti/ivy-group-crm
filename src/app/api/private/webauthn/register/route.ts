import { NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import { requirePrivateProfile } from "@/lib/private/access";
import { getRpConfig, stashChallenge, readChallenge, clearChallenge } from "@/lib/private/webauthn";
import { logPrivate } from "@/lib/private/audit";

/** Step 1 — hand the browser a registration challenge for a platform authenticator. */
export async function GET() {
  const gate = await requirePrivateProfile();
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { rpID, rpName } = await getRpConfig();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("private_webauthn_credentials")
    .select("credential_id, transports")
    .eq("user_id", gate.profile.id);

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: gate.profile.email ?? gate.profile.id,
    userDisplayName: gate.profile.display_name ?? gate.profile.full_name ?? "Private user",
    userID: new TextEncoder().encode(gate.profile.id),
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((c) => ({
      id: c.credential_id,
      transports: (c.transports ?? undefined) as AuthenticatorTransportFuture[] | undefined,
    })),
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      userVerification: "required",
    },
  });

  await stashChallenge("reg", options.challenge);
  return NextResponse.json(options);
}

type AuthenticatorTransportFuture = "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb";

/** Step 2 — verify the attestation and store the credential. */
export async function POST(request: Request) {
  const gate = await requirePrivateProfile();
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const attestation = body?.attestation;
  const deviceLabel = typeof body?.deviceLabel === "string" ? body.deviceLabel.trim().slice(0, 60) : null;
  if (!attestation) return NextResponse.json({ error: "Missing attestation" }, { status: 400 });

  const expectedChallenge = await readChallenge("reg");
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
  const { error } = await supabase.from("private_webauthn_credentials").insert({
    credential_id: cred.id,
    user_id: gate.profile.id,
    public_key: Buffer.from(cred.publicKey).toString("base64url"),
    counter: cred.counter,
    transports: cred.transports ?? null,
    device_label: deviceLabel,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logPrivate("biometric_registered", { detail: { device: deviceLabel } });
  return NextResponse.json({ ok: true });
}
