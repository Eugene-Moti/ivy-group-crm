import { NextResponse } from "next/server";
import { requirePrivateProfile } from "@/lib/private/access";
import { clearUnlock } from "@/lib/private/unlock";
import { logPrivate } from "@/lib/private/audit";

export async function POST() {
  const gate = await requirePrivateProfile();
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await clearUnlock();
  await logPrivate("lock");
  return NextResponse.json({ ok: true });
}
