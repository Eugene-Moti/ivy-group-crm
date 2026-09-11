import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePrivateProfile } from "@/lib/private/access";
import { withJson } from "@/lib/private/route-helpers";
import { verifyPin } from "@/lib/private/pin";

function normalize(v: string): string {
  return v.trim().toLowerCase();
}

/**
 * Checked from the command palette on every keystroke (debounced) — never
 * rendered as a visible search result, so there's nothing to notice even
 * mid-typo. Deliberately silent on every failure mode (wrong phrase, no
 * phrase set, not on the allowlist): always the same { match: false }
 * shape, no error, no status code that would hint anything exists. Each
 * user's phrase is their own, set from Private > Security.
 */
export const POST = withJson(async (request: Request) => {
  const gate = await requirePrivateProfile();

  const body = await request.json().catch(() => null);
  const typed = typeof body?.phrase === "string" ? body.phrase : "";

  if (!gate || !typed) {
    return NextResponse.json({ match: false });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("private_entry_phrase")
    .select("phrase_hash")
    .eq("user_id", gate.profile.id)
    .maybeSingle();

  const match = !!data?.phrase_hash && verifyPin(normalize(typed), data.phrase_hash);
  return NextResponse.json({ match });
});
