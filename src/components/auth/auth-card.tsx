"use client";

import { motion, useReducedMotion } from "framer-motion";
import { OrionMark } from "@/components/brand/orion-mark";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The glass card every sign-in step sits in, labelled with the workspace
 * being signed into. Ivy Group is the only workspace today; this becomes
 * the organisation's own name once Orion hosts more than one.
 */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      {...(reduce
        ? {}
        : { initial: { opacity: 0, y: 24, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, transition: { duration: 0.7, delay: 0.1, ease: EASE } })}
      className="relative w-full max-w-sm space-y-6 rounded-3xl border border-white/10 bg-white/[0.05] p-6 shadow-2xl shadow-black/50 backdrop-blur-2xl sm:p-8"
    >
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pr-3 pl-1">
          <span className="flex size-6 items-center justify-center rounded-full bg-evergreen text-[10px] font-semibold text-white">IG</span>
          <span className="text-xs text-muted-foreground">
            Ivy Group <span className="text-white/30">·</span> workspace
          </span>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-3xl tracking-tight text-[#f6f4ee]">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
      <div className="flex items-center justify-center gap-2 border-t border-white/5 pt-4 text-[11px] text-white/35">
        <OrionMark className="size-4" />
        Powered by Orion CRM
      </div>
    </motion.div>
  );
}
