"use client";

import { createContext, useCallback, useContext } from "react";
import { useRouter } from "next/navigation";

type AssistantContextValue = {
  /** Sends the user to Orion. If provided, prefills (doesn't auto-send) its input with this prompt. */
  openAssistant: (seedPrompt?: string) => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const openAssistant = useCallback(
    (prompt?: string) => {
      router.push(prompt ? `/orion?ask=${encodeURIComponent(prompt)}` : "/orion");
    },
    [router]
  );

  return <AssistantContext.Provider value={{ openAssistant }}>{children}</AssistantContext.Provider>;
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
}
