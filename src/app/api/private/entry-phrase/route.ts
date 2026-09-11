import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePrivateProfile } from "@/lib/private/access";
import { isUnlocked } from "@/lib/private/unlock";
import { logPrivate } from "@/lib/private/audit";
import { withJson } from "@/lib/private/route-helpers";
import { hashPin, verifyPin } from "@/lib/private/pin";

const MIN_LENGTH = 4;
const MAX_LENGTH = 60;

function normalize(v: string): string {
  return v.trim().toLowerCase();
}

function isValidPhrase(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const n = v.trim();
  return n.length >= MIN_LENGTH && n.length <= MAX_LENGTH;
}

/** Whether you already have a personal entry phrase set. */
export const GET = withJson(async () => {
  const gate = await requirePrivateProfile();
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("private_entry_phrase")
    .select("updated_at")
    .eq("user_id", gate.profile.id)
    .maybeSingle();

  return NextResponse.json({ set: !!data, updatedAt: data?.updated_at ?? null });
});

/** Set or change your own entry phrase. Changing an existing one needs the old phrase or an active unlock. */
export const POST = withJson(async (request: Request) => {
  const gate = await requirePrivateProfile();
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const newPhrase = body?.newPhrase;
  const currentPhrase = typeof body?.currentPhrase === "string" ? body.currentPhrase : "";

  if (!isValidPhrase(newPhrase)) {
    return NextResponse.json(
      { error: `Phrase must be ${MIN_LENGTH}–${MAX_LENGTH} characters.` },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("private_entry_phrase")
    .select("phrase_hash")
    .eq("user_id", gate.profile.id)
    .maybeSingle();

  if (existing?.phrase_hash) {
    const unlocked = await isUnlocked(gate.profile.id);
    if (!unlocked && !verifyPin(normalize(currentPhrase), existing.phrase_hash)) {
      return NextResponse.json({ error: "Current phrase is incorrect." }, { status: 403 });
    }
  }

  const { error } = await supabase.from("private_entry_phrase").upsert({
    user_id: gate.profile.id,
    phrase_hash: hashPin(normalize(newPhrase)),
    updated_at: new Date().toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logPrivate("pin_set", { detail: { kind: "entry_phrase" } });
  return NextResponse.json({ ok: true });
});
