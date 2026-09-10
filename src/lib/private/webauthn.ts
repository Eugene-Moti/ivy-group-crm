import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

const CHALLENGE_COOKIE = "ivy_private_wac";
const CHALLENGE_TTL_SECONDS = 5 * 60;

export type RpConfig = { rpID: string; rpName: string; origin: string };

/**
 * WebAuthn is bound to an exact domain. Derive it from the request host so
 * the same code works on localhost and the deployed domain without config —
 * `PRIVATE_WEBAUTHN_RP_ID` / `PRIVATE_WEBAUTHN_ORIGIN` override if a proxy
 * ever makes the host header untrustworthy.
 */
export async function getRpConfig(): Promise<RpConfig> {
  const h = await headers();
  const host = process.env.PRIVATE_WEBAUTHN_RP_ID
    ? process.env.PRIVATE_WEBAUTHN_RP_ID
    : (h.get("host") ?? "localhost").split(":")[0];
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const proto = isLocal ? "http" : "https";
  const rawHost = h.get("host") ?? "localhost";
  const origin = process.env.PRIVATE_WEBAUTHN_ORIGIN ?? `${proto}://${rawHost}`;
  return { rpID: host, rpName: "Ivy Group CRM — Private", origin };
}

function secret(): string {
  const s = process.env.PRIVATE_UNLOCK_SECRET;
  if (!s || s.length < 16) throw new Error("PRIVATE_UNLOCK_SECRET is not set.");
  return s;
}

function sign(v: string): string {
  return createHmac("sha256", secret()).update(v).digest("base64url");
}

/** Stash the ceremony challenge in a short-lived signed cookie. */
export async function stashChallenge(purpose: "reg" | "auth", challenge: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + CHALLENGE_TTL_SECONDS;
  const body = `${purpose}.${exp}.${challenge}`;
  const store = await cookies();
  store.set(CHALLENGE_COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

export async function readChallenge(purpose: "reg" | "auth"): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(CHALLENGE_COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx < 0) return null;
  const body = raw.slice(0, idx);
  const mac = raw.slice(idx + 1);
  const expectedMac = sign(body);
  if (
    Buffer.from(mac).length !== Buffer.from(expectedMac).length ||
    !timingSafeEqual(Buffer.from(mac), Buffer.from(expectedMac))
  ) {
    return null;
  }
  const [p, expStr, ...rest] = body.split(".");
  if (p !== purpose) return null;
  if (Number(expStr) * 1000 < Date.now()) return null;
  return rest.join(".");
}

export async function clearChallenge(): Promise<void> {
  const store = await cookies();
  store.delete(CHALLENGE_COOKIE);
}
