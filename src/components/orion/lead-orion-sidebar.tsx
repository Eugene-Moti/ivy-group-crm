"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { OrionChatBody } from "@/components/orion/orion-chat-body";

/**
 * Orion, scoped to whichever lead you're looking at — a floating trigger so
 * it's always one click away from a lead's page without leaving it for the
 * full /orion page. Keyed by leadId so switching to a different lead (via
 * the referred-leads list, search, etc. without a full page reload) starts
 * a fresh conversation rather than carrying over the previous lead's chat.
 */
export function LeadOrionSidebar({ leadId, leadName }: { leadId: string; leadName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Ask Orion about ${leadName}`}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-medium text-white shadow-lg shadow-ink/25 transition-transform hover:scale-105"
      >
        <span className="relative flex size-5 shrink-0 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold/50" />
          <Sparkles className="relative size-4 text-gold" />
        </span>
        <span>Ask Orion about this lead</span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 p-4 pt-12 data-[side=right]:sm:max-w-lg">
          <OrionChatBody
            key={leadId}
            scopedLead={{ id: leadId, name: leadName }}
            starterPrompts={[
              `Summarize where ${leadName} stands and what to do next`,
              `Any red flags in ${leadName}'s notes or activity so far?`,
              `Draft a follow-up message for ${leadName}`,
            ]}
            headerTitle={`Orion on ${leadName}`}
            headerDescription="Scoped to this lead — Orion has already reviewed their notes, evidence, and timeline."
            placeholder={`Ask Orion about ${leadName}…`}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
