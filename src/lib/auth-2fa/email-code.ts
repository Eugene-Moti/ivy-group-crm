import "server-only";
import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

const CODE_TTL_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 45;
const SENDS_PER_WINDOW = 5;
const WINDOW_MINUTES = 15;

function hashCode(code: string): string {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(code, salt, 64).toString("hex")}`;
}

function verifyCode(code: string, stored: string): boolean {
  const [, saltHex, hashHex] = stored.split("$");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(code, Buffer.from(saltHex, "hex"), 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export type SendResult =
  | { ok: true; cooldownSeconds: number }
  | { ok: false; status: number; error: string };

/**
 * Generates a fresh 6-digit code (unless one was just sent — then it
 * reports the cooldown instead of spamming), stores its hash, and emails
 * it. Rate-limited per user.
 */
export async function sendLoginCode(userId: string, email: string): Promise<SendResult> {
  if (!process.env.RESEND_API_KEY) {
    return { ok: false, status: 503, error: "Email isn't configured — ask an admin." };
  }

  const admin = createAdminClient();
  const now = Date.now();
  const { data: existing } = await admin
    .from("auth_2fa_codes")
    .select("last_sent_at, sends_in_window, window_start, expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  let sendsInWindow = 1;
  let windowStart = new Date(now).toISOString();
  if (existing) {
    const windowAgeMs = now - new Date(existing.window_start).getTime();
    if (windowAgeMs < WINDOW_MINUTES * 60_000) {
      if ((existing.sends_in_window ?? 0) >= SENDS_PER_WINDOW) {
        const waitMin = Math.ceil((WINDOW_MINUTES * 60_000 - windowAgeMs) / 60_000);
        return {
          ok: false,
          status: 429,
          error: `Too many codes requested. Try again in ${waitMin} minute${waitMin === 1 ? "" : "s"}.`,
        };
      }
      sendsInWindow = (existing.sends_in_window ?? 0) + 1;
      windowStart = existing.window_start;
    }

    const sinceLastSentS = (now - new Date(existing.last_sent_at).getTime()) / 1000;
    const codeStillValid = new Date(existing.expires_at).getTime() > now;
    if (sinceLastSentS < RESEND_COOLDOWN_SECONDS && codeStillValid) {
      return { ok: true, cooldownSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - sinceLastSentS) };
    }
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error: upsertError } = await admin.from("auth_2fa_codes").upsert({
    user_id: userId,
    code_hash: hashCode(code),
    expires_at: new Date(now + CODE_TTL_MINUTES * 60_000).toISOString(),
    attempts: 0,
    last_sent_at: new Date(now).toISOString(),
    sends_in_window: sendsInWindow,
    window_start: windowStart,
  });
  if (upsertError) return { ok: false, status: 500, error: upsertError.message };

  const from = process.env.AUTH_2FA_FROM || process.env.DIGEST_FROM_EMAIL || "Ivy Group CRM <onboarding@resend.dev>";
  try {
    await new Resend(process.env.RESEND_API_KEY).emails.send({
      from,
      to: email,
      subject: `${code} is your Ivy Group CRM sign-in code`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:440px;margin:0 auto">
          <p style="color:#C9A84C;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px">Ivy Group CRM</p>
          <h1 style="font-size:18px;font-weight:400;margin:0 0 16px;color:#111">Your sign-in code</h1>
          <p style="font-size:34px;font-weight:700;letter-spacing:8px;color:#111;margin:0 0 16px">${code}</p>
          <p style="font-size:13px;color:#666;line-height:1.5;margin:0">
            Expires in ${CODE_TTL_MINUTES} minutes. If you didn't just sign in, someone has your
            password — change it, and tell an admin.
          </p>
        </div>`,
    });
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: err instanceof Error ? err.message : "Couldn't send the email.",
    };
  }

  return { ok: true, cooldownSeconds: RESEND_COOLDOWN_SECONDS };
}

export type VerifyResult = { ok: true } | { ok: false; status: number; error: string };

export async function verifyLoginCode(userId: string, code: string): Promise<VerifyResult> {
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("auth_2fa_codes")
    .select("code_hash, expires_at, attempts")
    .eq("user_id", userId)
    .maybeSingle();

  if (!row || new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, status: 400, error: "That code has expired — request a new one." };
  }
  if ((row.attempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    await admin.from("auth_2fa_codes").delete().eq("user_id", userId);
    return { ok: false, status: 429, error: "Too many wrong tries — request a new code." };
  }

  if (!verifyCode(code, row.code_hash)) {
    const left = MAX_VERIFY_ATTEMPTS - ((row.attempts ?? 0) + 1);
    await admin
      .from("auth_2fa_codes")
      .update({ attempts: (row.attempts ?? 0) + 1 })
      .eq("user_id", userId);
    return {
      ok: false,
      status: 403,
      error: `Incorrect code.${left > 0 ? ` ${left} attempt${left === 1 ? "" : "s"} left.` : ""}`,
    };
  }

  await admin.from("auth_2fa_codes").delete().eq("user_id", userId);
  return { ok: true };
}
