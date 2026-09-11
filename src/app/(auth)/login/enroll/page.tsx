import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { require2faSession } from "@/lib/auth-2fa/guard";
import { AuthStepShell } from "@/components/auth/auth-step-shell";
import { TwoFactorEnroll } from "@/components/auth/two-factor-enroll";

export const metadata = { title: "Set up your sign-in PIN · Ivy Group CRM" };

export default async function EnrollPage() {
  const session = await require2faSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase
    .from("auth_2fa_pin")
    .select("pin_set_at")
    .eq("user_id", session.userId)
    .maybeSingle();
  if (data?.pin_set_at) redirect("/login/verify");

  return (
    <AuthStepShell
      title="Set up your sign-in PIN"
      subtitle="Every account needs one — a 6–12 digit code asked for after your password."
    >
      <TwoFactorEnroll />
    </AuthStepShell>
  );
}
