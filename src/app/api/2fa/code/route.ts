import { NextResponse } from "next/server";
import { require2faSession } from "@/lib/auth-2fa/guard";
import { grant2fa, is2faVerified } from "@/lib/auth-2fa/verified";
import { sendLoginCode, verifyLoginCode } from "@/lib/auth-2fa/email-code";
import { log2fa } from "@/lib/auth-2fa/audit";
import { withJson } from "@/lib/private/route-helpers";

/** Send (or resend) the sign-in code to the user's email. */
export const POST = withJson(async () => {
  const s = await require2faSession();
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (await is2faVerified(s.userId, s.sessionId)) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }
  if (!s.email) {
    return NextResponse.json({ error: "No email on your account — ask an admin." }, { status: 400 });
  }

  const result = await sendLoginCode(s.userId, s.email);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  await log2fa("code_sent");
  return NextResponse.json({ ok: true, cooldownSeconds: result.cooldownSeconds });
});

/** Verify the entered code → clear the second factor for this session. */
export const PUT = withJson(async (request: Request) => {
  const s = await require2faSession();
  if (!s) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (code.length !== 6) return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });

  const result = await verifyLoginCode(s.userId, code);
  if (!result.ok) {
    await log2fa("verify_failed");
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await grant2fa(s.userId, s.sessionId);
  await log2fa("verified");
  return NextResponse.json({ ok: true });
});
