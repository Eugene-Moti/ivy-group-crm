"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Viewer = { id: string; name: string };

/**
 * "Who else is looking at this lead right now" — a Supabase Realtime
 * Presence channel scoped to this one lead. Genuinely useful (stops two
 * people working the same lead blind), and makes a multi-user CRM feel
 * like one — no new dependency, Presence is already part of supabase-js.
 */
export function LeadPresence({ leadId }: { leadId: string }) {
  const profile = useProfile();
  const [viewers, setViewers] = useState<Viewer[]>([]);

  useEffect(() => {
    if (!profile) return;

    const supabase = createClient();
    const channel = supabase.channel(`lead-presence-${leadId}`, {
      config: { presence: { key: profile.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string }>();
        const others = Object.entries(state)
          .filter(([key]) => key !== profile.id)
          .map(([key, entries]) => ({ id: key, name: entries[0]?.name ?? "A teammate" }));
        setViewers(others);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: profile.full_name ?? "A teammate" });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, profile]);

  if (viewers.length === 0) return null;

  return (
    <div
      className="flex items-center gap-1.5"
      title={`Also viewing: ${viewers.map((v) => v.name).join(", ")}`}
    >
      <div className="flex -space-x-2">
        <AnimatePresence initial={false}>
          {viewers.slice(0, 4).map((v) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <Avatar className="size-6 border-2 border-background">
                <AvatarFallback className="bg-ivy-700 text-[10px] font-semibold text-white">
                  {v.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <span className="text-xs text-muted-foreground">
        {viewers.length === 1 ? "also viewing" : `${viewers.length} also viewing`}
      </span>
    </div>
  );
}
