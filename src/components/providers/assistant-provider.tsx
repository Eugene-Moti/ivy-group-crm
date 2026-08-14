"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AssistantPanel } from "@/components/assistant/assistant-panel";

type AssistantContextValue = {
  open: boolean;
  /** Opens the assistant panel. If provided, prefills (doesn't auto-send) the input with this prompt. */
  openAssistant: (seedPrompt?: string) => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [seedPrompt, setSeedPrompt] = useState<string | undefined>(undefined);
  const [seedKey, setSeedKey] = useState(0);

  const openAssistant = useCallback((prompt?: string) => {
    if (prompt) {
      setSeedPrompt(prompt);
      setSeedKey((k) => k + 1);
    }
    setOpen(true);
  }, []);

  return (
    <AssistantContext.Provider value={{ open, openAssistant }}>
      {children}
      <AssistantPanel open={open} onOpenChange={setOpen} seedPrompt={seedPrompt} seedKey={seedKey} />
    </AssistantContext.Provider>
  );
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within AssistantProvider");
  return ctx;
}
