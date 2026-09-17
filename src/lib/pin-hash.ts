import "server-only";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SCRYPT_KEYLEN = 64;
export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCKOUT_MINUTES = 15;
export const PIN_MIN_LENGTH = 6;

/** `scrypt$<saltHex>$<hashHex>` — self-describing so the format can change later. */
export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), SCRYPT_KEYLEN);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d+$/.test(pin) && pin.length >= PIN_MIN_LENGTH && pin.length <= 12;
}
