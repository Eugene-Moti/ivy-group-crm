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
  const [hour, setHour] = useState<number | null>(null);
  const { notifications, isLoading } = useNotifications(isAdmin);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the visitor's actual clock, an external signal the server can't know and can't be computed during render without risking a hydration mismatch
    setHour(new Date().getHours());
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

  if (hour === null) {
    // Matches the final layout so nothing visibly shifts once the real greeting lands.
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight opacity-0">Loading, {name} 👋</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s on your plate today.</p>
      </div>
    );
  }

  const showTypewriter = !!plateLine;
  const displayLine = showTypewriter ? typed : "Here's what's on your plate today.";

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <h1 className="text-2xl font-semibold tracking-tight">
        {greetingForHour(hour)}
        {name} 👋
      </h1>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
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
