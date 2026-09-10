import "server-only";
import { notFound, redirect } from "next/navigation";
import { requirePrivateProfile } from "@/lib/private/access";
import { isUnlocked, unlockSecondsRemaining } from "@/lib/private/unlock";
import type { Profile } from "@/lib/auth";

/** For the /private layout: on the allowlist or it doesn't exist. */
export async function requirePrivateAccessOrNotFound(): Promise<{
  profile: Profile;
  isOwner: boolean;
  unlocked: boolean;
  secondsRemaining: number;
}> {
  const gate = await requirePrivateProfile();
  if (!gate) notFound();
  const [unlocked, secondsRemaining] = await Promise.all([
    isUnlocked(gate.profile.id),
    unlockSecondsRemaining(gate.profile.id),
  ]);
  return { profile: gate.profile, isOwner: gate.access.isOwner, unlocked, secondsRemaining };
}

/** For pages under /private: bounce to the gate if the unlock has lapsed. */
export async function requireUnlockedPrivate(): Promise<{ profile: Profile; isOwner: boolean }> {
  const gate = await requirePrivateProfile();
  if (!gate) notFound();
  if (!(await isUnlocked(gate.profile.id))) redirect("/private");
  return { profile: gate.profile, isOwner: gate.access.isOwner };
}
