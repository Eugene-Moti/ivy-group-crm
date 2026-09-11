import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { requirePrivateProfile } from "@/lib/private/access";
import { withJson } from "@/lib/private/route-helpers";

function normalize(v: string): string {
  return v.trim().toLowerCase();
}

/**
 * Checked from the command palette on every keystroke (debounced) — never
 * rendered as a visible search result, so there's nothing to notice even
 * mid-typo. Deliberately silent on every failure mode (wrong phrase, no
 * phrase configured, not on the allowlist): always the same { match: false
 * } shape, no error, no status code that would hint anything exists.
 */
export const POST = withJson(async (request: Request) => {
  const gate = await requirePrivateProfile();
  const configured = process.env.PRIVATE_ENTRY_PHRASE;

  const body = await request.json().catch(() => null);
  const typed = typeof body?.phrase === "string" ? body.phrase : "";

  if (!gate || !configured || !typed) {
    return NextResponse.json({ match: false });
  }

  const a = Buffer.from(normalize(typed));
  const b = Buffer.from(normalize(configured));
  const match = a.length === b.length && timingSafeEqual(a, b);

  return NextResponse.json({ match });
});
