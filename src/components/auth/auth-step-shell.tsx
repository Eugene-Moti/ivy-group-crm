import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthCard } from "@/components/auth/auth-card";

/** The sign-in frame for the PIN verify / enrol steps — same look as the login page. */
export function AuthStepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <AuthLayout>
      <AuthCard title={title} subtitle={subtitle}>
        {children}
      </AuthCard>
    </AuthLayout>
  );
}
