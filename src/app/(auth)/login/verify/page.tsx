import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { require2faSession } from "@/lib/auth-2fa/guard";
import { AuthStepShell } from "@/components/auth/auth-step-shell";
import { TwoFactorVerify } from "@/components/auth/two-factor-verify";

export const metadata = { title: "Enter your PIN · Orion CRM" };

export default async function VerifyPage() {
  const session = await require2faSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("auth_2fa_pin")
    .select("pin_set_at")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (!data?.pin_set_at) redirect("/login/enroll");

  return (
    <AuthStepShell title="Enter your PIN" subtitle="One more step before you're in.">
      <TwoFactorVerify />
    </AuthStepShell>
  );
}
