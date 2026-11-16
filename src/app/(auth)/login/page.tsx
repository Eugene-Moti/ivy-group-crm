import { connection } from "next/server";
import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginFormPanel } from "@/components/auth/login-form-panel";
import { getWorkspace } from "@/lib/queries/workspace";

export default async function LoginPage() {
  // Render per request, not at build time, so a branding change in
  // Settings → Workspace shows on the sign-in page straight away.
  await connection();
  const workspace = await getWorkspace();
  return (
    <AuthLayout workspace={workspace}>
      <LoginFormPanel />
    </AuthLayout>
  );
}
