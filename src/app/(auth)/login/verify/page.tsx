import { redirect } from "next/navigation";
import { getMy2faStatus } from "@/lib/auth-2fa/status";
import { AuthStepShell } from "@/components/auth/auth-step-shell";
import { TwoFactorVerify } from "@/components/auth/two-factor-verify";

export const metadata = { title: "Verify it's you · Ivy Group CRM" };

export default async function VerifyPage() {
  const status = await getMy2faStatus();
  if (!status.enrolled) redirect("/login/enroll");

  return (
    <AuthStepShell
      title="Verify it's you"
      subtitle="One more step — confirm with your passkey or PIN."
    >
      <TwoFactorVerify hasPasskey={status.devices.length > 0} hasPin={status.pinSet} />
    </AuthStepShell>
  );
}
