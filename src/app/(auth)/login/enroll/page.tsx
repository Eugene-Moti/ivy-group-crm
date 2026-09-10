import { redirect } from "next/navigation";
import { getMy2faStatus } from "@/lib/auth-2fa/status";
import { AuthStepShell } from "@/components/auth/auth-step-shell";
import { TwoFactorEnroll } from "@/components/auth/two-factor-enroll";

export const metadata = { title: "Set up sign-in security · Ivy Group CRM" };

export default async function EnrollPage() {
  const status = await getMy2faStatus();
  if (status.enrolled) redirect("/login/verify");

  return (
    <AuthStepShell
      title="Set up sign-in security"
      subtitle="Every account needs a second factor. Add this device's fingerprint / face unlock, or a PIN."
    >
      <TwoFactorEnroll />
    </AuthStepShell>
  );
}
