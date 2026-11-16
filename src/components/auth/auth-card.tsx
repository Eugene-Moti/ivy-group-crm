"use client";

import { motion } from "framer-motion";
import { OrionMark } from "@/components/brand/orion-mark";
import { WorkspaceBadge } from "@/components/brand/workspace-badge";
import { useWorkspace } from "@/components/providers/workspace-provider";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The glass card every sign-in step sits in, labelled with the workspace
 * being signed into — its name, logo and tagline come from Settings →
 * Workspace (Ivy Group until that is changed).
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
  const workspace = useWorkspace();
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
      className="relative w-full max-w-sm space-y-6 rounded-3xl border border-white/15 bg-[linear-gradient(160deg,rgb(255_255_255/0.12),rgb(255_255_255/0.04))] p-6 shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_40px_80px_-30px_rgb(0_0_0/0.8)] backdrop-blur-2xl backdrop-saturate-150 sm:p-8"
    >
      <div className="space-y-4">
        <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/15 bg-black/20 py-1 pr-3 pl-1">
          <WorkspaceBadge workspace={workspace} className="size-6 rounded-full" />
          <span className="truncate text-xs text-white/75">
            {workspace.name} <span className="text-white/35">·</span> {workspace.tagline || "workspace"}
          </span>
        </div>
        <div className="space-y-1.5">
          <h1 className="text-3xl tracking-tight text-[#f6f4ee]">{title}</h1>
          <p className="text-sm text-white/65">{subtitle}</p>
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
