import { requirePrivateAccessOrNotFound } from "@/lib/private/guard";
import { createClient } from "@/lib/supabase/server";
import { PrivateUnlockGate } from "@/components/private/private-unlock-gate";
import { PrivateShell } from "@/components/private/private-shell";

export const metadata = { title: "Private · Ivy Group CRM" };

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const { profile, unlocked, secondsRemaining } = await requirePrivateAccessOrNotFound();

  if (!unlocked) {
    const supabase = await createClient();
    const { data: cred } = await supabase
      .from("private_area_credentials")
      .select("pin_set_at")
      .eq("user_id", profile.id)
      .maybeSingle();
    const { count } = await supabase
      .from("private_webauthn_credentials")
      .select("credential_id", { count: "exact", head: true })
      .eq("user_id", profile.id);

    return (
      <PrivateUnlockGate hasPin={!!cred?.pin_set_at} hasBiometric={(count ?? 0) > 0} />
    );
  }

  return <PrivateShell secondsRemaining={secondsRemaining}>{children}</PrivateShell>;
}
