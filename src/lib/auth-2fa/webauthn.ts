import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";

const CHALLENGE_COOKIE = "ivy_2fa_wac";
const CHALLENGE_TTL_SECONDS = 5 * 60;

export type RpConfig = { rpID: string; rpName: string; origin: string };

/** Derive the WebAuthn RP from the request host (works on localhost and prod). */
export async function getRpConfig(): Promise<RpConfig> {
  const h = await headers();
  const rawHost = h.get("host") ?? "localhost";
  const host = process.env.PRIVATE_WEBAUTHN_RP_ID ?? rawHost.split(":")[0];
  const isLocal = host === "localhost" || host === "127.0.0.1";
  const origin = process.env.PRIVATE_WEBAUTHN_ORIGIN ?? `${isLocal ? "http" : "https"}://${rawHost}`;
  return { rpID: host, rpName: "Ivy Group CRM", origin };
}

function secret(): string {
  const s = process.env.PRIVATE_UNLOCK_SECRET;
  if (!s || s.length < 16) throw new Error("PRIVATE_UNLOCK_SECRET is not set.");
  return s;
}

function sign(v: string): string {
  return createHmac("sha256", secret()).update(v).digest("base64url");
}

export async function stashChallenge(challenge: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + CHALLENGE_TTL_SECONDS;
  const body = `${exp}.${challenge}`;
  const store = await cookies();
  store.set(CHALLENGE_COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

export async function readChallenge(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(CHALLENGE_COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx < 0) return null;
  const body = raw.slice(0, idx);
  const mac = raw.slice(idx + 1);
  const expected = sign(body);
  if (
    Buffer.from(mac).length !== Buffer.from(expected).length ||
    !timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
  ) {
    return null;
  }
  const [expStr, ...rest] = body.split(".");
  if (Number(expStr) * 1000 < Date.now()) return null;
  return rest.join(".");
}

export async function clearChallenge(): Promise<void> {
  const store = await cookies();
  store.delete(CHALLENGE_COOKIE);
}
