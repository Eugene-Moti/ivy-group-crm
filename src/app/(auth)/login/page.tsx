import { AuthLayout } from "@/components/auth/auth-layout";
import { LoginFormPanel } from "@/components/auth/login-form-panel";

export default function LoginPage() {
  return (
    <AuthLayout>
      <LoginFormPanel />
    </AuthLayout>
  );
}
