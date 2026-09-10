import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const TWO_FA_COOKIE = "ivy_2fa";
const TTL_SECONDS = 12 * 60 * 60; // a working day; a fresh sign-in always re-verifies

function secret(): string {
  const s = process.env.PRIVATE_UNLOCK_SECRET;
  if (!s || s.length < 16) {
    throw new Error("PRIVATE_UNLOCK_SECRET is not set (needs a random string, 16+ chars).");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function eq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Pure check — no cookie store access, so the proxy (which reads
 * request.cookies, not next/headers) and route handlers share one
 * implementation. Bound to BOTH the user id and the Supabase session id, so
 * a new sign-in (new session id) can't inherit a past verification.
 */
export function verifyTwoFaToken(
  token: string | undefined,
  userId: string,
  sessionId: string
): boolean {
  try {
    if (!token) return false;
    const parts = token.split(".");
    if (parts.length !== 4) return false;
    const [uid, sid, expStr, mac] = parts;
    if (uid !== userId || sid !== sessionId) return false;
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
    return eq(mac, sign(`${uid}.${sid}.${expStr}`));
  } catch {
    // A missing signing secret shouldn't 500 the middleware on every
    // request — treat as "not verified" and let the flow route to setup.
    return false;
  }
}

/** Route-handler side: mint the verification cookie for this user + session. */
export async function grant2fa(userId: string, sessionId: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const body = `${userId}.${sessionId}.${exp}`;
  const store = await cookies();
  store.set(TWO_FA_COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function clear2fa(): Promise<void> {
  const store = await cookies();
  store.delete(TWO_FA_COOKIE);
}

/** Route-handler / server-component side. */
export async function is2faVerified(userId: string, sessionId: string): Promise<boolean> {
  const store = await cookies();
  return verifyTwoFaToken(store.get(TWO_FA_COOKIE)?.value, userId, sessionId);
}
