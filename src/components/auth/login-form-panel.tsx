"use client";

import { Suspense } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ContactFooter } from "@/components/layout/contact-footer";
import { LoginForm } from "@/components/auth/login-form";
import { IdleLogoutNotice } from "@/components/auth/idle-logout-notice";

const EASE = [0.16, 1, 0.3, 1] as const;

export function LoginFormPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
      className="dark relative w-full max-w-sm space-y-6 rounded-3xl border border-white/10 bg-white/[0.06] p-6 text-foreground shadow-2xl shadow-black/50 backdrop-blur-2xl sm:p-8"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.75, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="relative w-fit"
        >
          <motion.div
            aria-hidden
            className="absolute -inset-6 -z-10 rounded-full bg-gold/25 blur-2xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.45, 0.8, 0.45] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />
          <Image
            src="/ivy-group-logo-full.png"
            alt="The Ivy Group"
            width={640}
            height={640}
            className="h-14 w-14 object-contain"
            priority
          />
        </motion.div>

        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access the lead pipeline.
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <LoginForm />
        <IdleLogoutNotice />
      </Suspense>

      <ContactFooter className="justify-center text-muted-foreground" />
    </motion.div>
  );
}
