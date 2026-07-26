"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { ContactFooter } from "@/components/layout/contact-footer";

const EASE = [0.16, 1, 0.3, 1] as const;

const headlineContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.55 } },
};

const wordVariant: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.6, ease: EASE },
  },
};

type Segment = { text: string; className?: string };

function FlyInHeadline({ segments }: { segments: Segment[] }) {
  const words = segments.flatMap((seg, si) =>
    seg.text
      .split(" ")
      .map((text, wi) => ({ text, className: seg.className, key: `${si}-${wi}` }))
  );

  return (
    <motion.p
      className="text-2xl font-medium text-balance"
      variants={headlineContainer}
      initial="hidden"
      animate="show"
    >
      {words.map((w, i) => (
        <motion.span key={w.key} variants={wordVariant} className={cn("inline-block", w.className)}>
          {w.text}
          {i < words.length - 1 ? " " : ""}
        </motion.span>
      ))}
    </motion.p>
  );
}

export function LoginHero() {
  return (
    <div className="relative flex h-full w-full flex-col justify-between p-10 text-sidebar-foreground">
      <motion.div
        initial={{ opacity: 0, scale: 0.75, y: -16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="relative w-fit"
      >
        <motion.div
          aria-hidden
          className="absolute -inset-8 -z-10 rounded-full bg-gold/25 blur-3xl"
          animate={{ scale: [1, 1.25, 1], opacity: [0.45, 0.8, 0.45] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <Image
          src="/ivy-group-logo-full.png"
          alt="The Ivy Group"
          width={1200}
          height={1200}
          className="h-24 w-24 object-contain"
          priority
        />
      </motion.div>

      <div className="space-y-3">
        <FlyInHeadline
          segments={[
            { text: "Every buyer lead, one pipeline —" },
            { text: "from first click to closing.", className: "text-gold" },
          ]}
        />
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.4, ease: EASE }}
          className="text-sm text-sidebar-foreground/60"
        >
          Internal lead &amp; client management for the Ivy Group marketing
          team.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.7, ease: EASE }}
        className="space-y-2"
      >
        <ContactFooter className="text-sidebar-foreground" />
        <p className="text-xs text-sidebar-foreground/40">
          © {new Date().getFullYear()} Ivy Group Real Estate
        </p>
      </motion.div>
    </div>
  );
}
