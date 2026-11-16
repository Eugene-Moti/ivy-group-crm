"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useProfile, useIsAdmin } from "@/components/providers/profile-provider";
import { useNotifications } from "@/hooks/use-notifications";

const TYPE_SPEED_MS = 18;

function greetingForHour(hour: number): string {
  if (hour < 5) return "Still up, ";
  if (hour < 12) return "Good morning, ";
  if (hour < 17) return "Good afternoon, ";
  if (hour < 21) return "Good evening, ";
  return "Working late, ";
}

function plateLineFor(criticalCount: number, totalCount: number): string {
  if (criticalCount > 0) {
    return `You have ${criticalCount} urgent item${criticalCount === 1 ? "" : "s"} that need${criticalCount === 1 ? "s" : ""} attention today.`;
  }
  if (totalCount > 0) {
    return `${totalCount} item${totalCount === 1 ? "" : "s"} worth a look when you get a chance.`;
  }
  return "You're all caught up — nothing urgent today.";
}

/**
 * Computed client-side only (an effect, not a render-time Date()) — the
 * server and a visitor's browser can disagree on the hour, and getting
 * that wrong would mean the server-rendered markup mismatches what React
 * renders on the client, which Next.js treats as a hydration error.
 *
 * The "what's on your plate" line types itself out like Orion is drafting
 * it live — a small touch, but it's the first thing an admin sees after
 * logging in, so it's worth the extra polish. Built from the same
 * deterministic notifications data as the Needs Attention card (no live AI
 * call here — that stays instant and free on every dashboard load).
 */
export function DashboardGreeting() {
  const profile = useProfile();
  const isAdmin = useIsAdmin();
  const [now, setNow] = useState<Date | null>(null);
  const { notifications, isLoading } = useNotifications(isAdmin);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the visitor's actual clock, an external signal the server can't know and can't be computed during render without risking a hydration mismatch
    setNow(new Date());
  }, []);

  const name = profile?.display_name || profile?.full_name?.split(" ")[0] || "there";
  const criticalCount = notifications.filter((n) => n.severity === "critical").length;
  const plateLine = isAdmin && !isLoading ? plateLineFor(criticalCount, notifications.length) : null;

  useEffect(() => {
    if (!plateLine) return;
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setTyped(plateLine.slice(0, i));
      if (i >= plateLine.length) clearInterval(id);
    }, TYPE_SPEED_MS);
    return () => clearInterval(id);
  }, [plateLine]);

  if (now === null) {
    // Matches the final layout so nothing visibly shifts once the real greeting lands.
    return (
      <div className="opacity-0">
        <p className="font-mono text-[11px] tracking-[0.18em] uppercase">Today</p>
        <h1 className="mt-1.5 text-3xl tracking-tight sm:text-4xl">Hello, {name}</h1>
        <p className="mt-1.5 text-sm">Here&apos;s what&apos;s on your plate today.</p>
      </div>
    );
  }

  const hour = now.getHours();
  const dateLabel = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const showTypewriter = !!plateLine;
  const displayLine = showTypewriter ? typed : "Here's what's on your plate today.";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
      <p className="flex items-center gap-2 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-evergreen-soft opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-2 rounded-full bg-evergreen-soft" />
        </span>
        {dateLabel}
      </p>
      <h1 className="mt-1.5 text-3xl tracking-tight sm:text-4xl">
        {greetingForHour(hour)}
        <span className="text-primary dark:text-gold-soft">{name}</span>
      </h1>
      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Sparkles className="size-3.5 shrink-0 text-gold" />
        <span>
          {displayLine}
          {showTypewriter && typed.length < plateLine.length && (
            <span className="ml-0.5 inline-block w-1.5 animate-pulse text-gold">|</span>
          )}
        </span>
      </p>
    </motion.div>
  );
}
