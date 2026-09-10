import { NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { createClient } from "@/lib/supabase/server";
import { require2faSession } from "@/lib/auth-2fa/guard";
import { getRpConfig, stashChallenge, readChallenge, clearChallenge } from "@/lib/auth-2fa/webauthn";
import { grant2fa } from "@/lib/auth-2fa/verified";
import { log2fa } from "@/lib/auth-2fa/audit";
import { withJson } from "@/lib/private/route-helpers";

type Transport = "ble" | "cable" | "hybrid" | "internal" | "nfc" | "smart-card" | "usb";

export const GET = withJson(async () => {
  const s = await require2faSession();
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { rpID } = await getRpConfig();
  const supabase = await createClient();
  const { data: creds } = await supabase
    .from("auth_2fa_webauthn")
    .select("credential_id, transports")
    .eq("user_id", s.userId);

  if (!creds || creds.length === 0) {
    return NextResponse.json({ error: "No passkey registered." }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: creds.map((c) => ({
      id: c.credential_id,
      transports: (c.transports ?? undefined) as Transport[] | undefined,
    })),
  });

  await stashChallenge(options.challenge);
  return NextResponse.json(options);
});

export const POST = withJson(async (request: Request) => {
  const s = await require2faSession();
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const assertion = body?.assertion;
  if (!assertion?.id) return NextResponse.json({ error: "Missing assertion" }, { status: 400 });

  const expectedChallenge = await readChallenge();
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge expired — try again." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: cred } = await supabase
    .from("auth_2fa_webauthn")
    .select("credential_id, public_key, counter")
    .eq("user_id", s.userId)
    .eq("credential_id", assertion.id)
    .maybeSingle();

  if (!cred) {
    await log2fa("verify_failed", { detail: { method: "passkey", reason: "unknown credential" } });
    return NextResponse.json({ error: "Unrecognised passkey." }, { status: 400 });
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
    await log2fa("verify_failed", { detail: { method: "passkey" } });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Verification failed" },
      { status: 400 }
    );
  }
  await clearChallenge();

  if (!verification.verified) {
    await log2fa("verify_failed", { detail: { method: "passkey" } });
    return NextResponse.json({ error: "Verification failed." }, { status: 400 });
  }

  await supabase
    .from("auth_2fa_webauthn")
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq("credential_id", cred.credential_id);

  await grant2fa(s.userId, s.sessionId);
  await log2fa("verified_passkey");
  return NextResponse.json({ ok: true });
});
