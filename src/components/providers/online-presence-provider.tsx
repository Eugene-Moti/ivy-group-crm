"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";

const OnlineTeamContext = createContext<Set<string>>(new Set());

/**
 * App-wide "who's online right now" — one Realtime Presence channel shared
 * by every signed-in user (distinct from LeadPresence, which is scoped to a
 * single lead). Powers the green dot on Team & Users cards. Same
 * fail-quiet shape as LeadPresence: a Realtime hiccup degrades to "nobody
 * shown online" rather than breaking anything else on the page.
 */
export function OnlinePresenceProvider({ children }: { children: React.ReactNode }) {
  const profile = useProfile();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile) return;

    let supabase: ReturnType<typeof createClient>;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    try {
      supabase = createClient();
      channel = supabase.channel("team-presence", {
        config: { presence: { key: profile.id } },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          try {
            const state = channel!.presenceState();
            setOnlineIds(new Set(Object.keys(state)));
          } catch (err) {
            console.error("Online presence: failed to read presence state", err);
          }
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED") {
            try {
              await channel!.track({ online_at: new Date().toISOString() });
            } catch (err) {
              console.error("Online presence: failed to track", err);
            }
          }
        });
    } catch (err) {
      console.error("Online presence: failed to set up channel", err);
      return;
    }

    return () => {
      try {
        supabase.removeChannel(channel!);
      } catch {
        // Already gone — nothing to clean up.
      }
    };
  }, [profile]);

  return <OnlineTeamContext.Provider value={onlineIds}>{children}</OnlineTeamContext.Provider>;
}

/** Set of profile ids currently online, app-wide. */
export function useOnlineTeam() {
  return useContext(OnlineTeamContext);
}
