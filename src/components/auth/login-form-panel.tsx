"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { ContactFooter } from "@/components/layout/contact-footer";
import { LoginForm } from "@/components/auth/login-form";
import { IdleLogoutNotice } from "@/components/auth/idle-logout-notice";
import { AuthCard } from "@/components/auth/auth-card";

const EASE = [0.22, 1, 0.36, 1] as const;

export function LoginFormPanel() {
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to your workspace to pick up where you left off.">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
        className="space-y-6"
      >
        <Suspense fallback={null}>
          <LoginForm />
          <IdleLogoutNotice />
        </Suspense>
        <ContactFooter className="justify-center text-muted-foreground" />
      </motion.div>
    </AuthCard>
  );
}
