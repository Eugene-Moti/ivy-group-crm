"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useProfile } from "@/components/providers/profile-provider";

function greetingForHour(hour: number): string {
  if (hour < 5) return "Still up, ";
  if (hour < 12) return "Good morning, ";
  if (hour < 17) return "Good afternoon, ";
  if (hour < 21) return "Good evening, ";
  return "Working late, ";
}

/**
 * Computed client-side only (an effect, not a render-time Date()) — the
 * server and a visitor's browser can disagree on the hour, and getting
 * that wrong would mean the server-rendered markup mismatches what React
 * renders on the client, which Next.js treats as a hydration error.
 */
export function DashboardGreeting() {
  const profile = useProfile();
  const [hour, setHour] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the visitor's actual clock, an external signal the server can't know and can't be computed during render without risking a hydration mismatch
    setHour(new Date().getHours());
  }, []);

  const name = profile?.display_name || profile?.full_name?.split(" ")[0] || "there";

  if (hour === null) {
    // Matches the final layout so nothing visibly shifts once the real greeting lands.
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight opacity-0">Loading, {name} 👋</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s on your plate today.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <h1 className="text-2xl font-semibold tracking-tight">
        {greetingForHour(hour)}
        {name} 👋
      </h1>
      <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s on your plate today.</p>
    </motion.div>
  );
}
