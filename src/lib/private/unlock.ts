import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "ivy_private_unlock";
const UNLOCK_TTL_SECONDS = 15 * 60;

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

function b64urlEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Mints an unlock token for this user, good for UNLOCK_TTL_SECONDS. The
 * token is `<userId>.<expiry>.<hmac>` — stateless, so nothing to store or
 * revoke server-side beyond letting it expire; "Lock now" just clears the
 * cookie.
 */
export async function grantUnlock(userId: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + UNLOCK_TTL_SECONDS;
  const body = `${userId}.${exp}`;
  const token = `${body}.${sign(body)}`;

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: UNLOCK_TTL_SECONDS,
  });
}

export async function clearUnlock(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** True only if the current cookie is a valid, unexpired unlock for `userId`. */
export async function isUnlocked(userId: string): Promise<boolean> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [uid, expStr, mac] = parts;
  if (uid !== userId) return false;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;

  return b64urlEqual(mac, sign(`${uid}.${expStr}`));
}

/** Seconds until the current unlock expires, or 0 if not unlocked. */
export async function unlockSecondsRemaining(userId: string): Promise<number> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return 0;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== userId) return 0;
  if (!b64urlEqual(parts[2], sign(`${parts[0]}.${parts[1]}`))) return 0;
  const exp = Number(parts[1]);
  const left = Math.floor(exp - Date.now() / 1000);
  return left > 0 ? left : 0;
}
