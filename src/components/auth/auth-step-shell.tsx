import { AuthLayout } from "@/components/auth/auth-layout";
import { AuthCard } from "@/components/auth/auth-card";
import { getWorkspace } from "@/lib/queries/workspace";

/** The sign-in frame for the PIN verify / enrol steps — same look as the login page. */
export async function AuthStepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const workspace = await getWorkspace();
  return (
    <AuthLayout workspace={workspace}>
      <AuthCard title={title} subtitle={subtitle}>
        {children}
      </AuthCard>
    </AuthLayout>
  );
}
