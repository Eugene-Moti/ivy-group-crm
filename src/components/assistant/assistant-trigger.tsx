"use client";

import { Sparkles } from "lucide-react";
import { useAssistant } from "@/components/providers/assistant-provider";

export function AssistantTrigger() {
  const { openAssistant } = useAssistant();

  return (
    <button
      type="button"
      aria-label="AI Assistant"
      onClick={() => openAssistant()}
      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Sparkles className="size-4.5" />
    </button>
  );
}
