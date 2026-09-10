import { redirect } from "next/navigation";
import { require2faSession } from "@/lib/auth-2fa/guard";
import { AuthStepShell } from "@/components/auth/auth-step-shell";
import { TwoFactorVerify } from "@/components/auth/two-factor-verify";

export const metadata = { title: "Verify it's you · Ivy Group CRM" };

function maskEmail(email: string | null): string {
  if (!email) return "your email";
  const [name, domain] = email.split("@");
  if (!domain) return "your email";
  const shown = name.slice(0, 2);
  return `${shown}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export default async function VerifyPage() {
  const session = await require2faSession();
  if (!session) redirect("/login");

  return (
    <AuthStepShell
      title="Verify it's you"
      subtitle={`Enter the 6-digit code we just emailed to ${maskEmail(session.email)}.`}
    >
      <TwoFactorVerify />
    </AuthStepShell>
  );
}
