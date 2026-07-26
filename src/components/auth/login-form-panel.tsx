"use client";

import { Suspense } from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/layout/logo";
import { ContactFooter } from "@/components/layout/contact-footer";
import { LoginForm } from "@/components/auth/login-form";
import { IdleLogoutNotice } from "@/components/auth/idle-logout-notice";

const EASE = [0.16, 1, 0.3, 1] as const;

export function LoginFormPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.25, ease: EASE }}
      className="relative w-full max-w-sm space-y-8"
    >
      <div className="lg:hidden">
        <Logo />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to access the lead pipeline.
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
        <IdleLogoutNotice />
      </Suspense>
      <ContactFooter className="lg:hidden" />
    </motion.div>
  );
}
