"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const PLACEHOLDER = `Example:

Michael Olanya is a sales manager AND the person who intakes WhatsApp leads and routes them to the right manager — his early notes on a lead are usually a handover, not a sign he owns the deal long-term.

Pipeline stages: "Negotiating" means the client has seen a unit and price talk is underway. "Offer Made" means we've sent a written offer — a lead shouldn't sit in Negotiating for more than ~2 weeks without one.

Follow-up cadence: Hot leads get contacted every 2-3 days, Warm every week, Cold every 2-3 weeks unless they ask for space.

Budget is expected to be captured as soon as it's known, even a rough range — don't treat a blank budget as "not asked yet" past the first couple of contacts.`;

/**
 * Free-text business context admins maintain for Orion — the durable
 * answer to whatever Orion itself asks for clarification on (team roles,
 * what a stage means in practice, conventions), instead of re-explaining
 * it in chat every time. Read by every Orion surface (chat, Portfolio
 * Briefing, daily digest) via getOrionBusinessContext().
 */
export function OrionContextPanel({ initialContent }: { initialContent: string }) {
  const router = useRouter();
  const profile = useProfile();
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const isDirty = content !== initialContent;

  async function handleSave() {
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("orion_business_context")
      .update({ content: content.trim(), updated_by: profile?.id ?? null })
      .eq("id", true);
    setIsSaving(false);

    if (error) {
      toast.error("Failed to save", { description: error.message });
      return;
    }

    toast.success("Orion will use this from now on");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" />
        <p className="text-sm text-muted-foreground">
          Answer here whatever Orion can&apos;t figure out from the data alone — who&apos;s who on the
          team, what a pipeline stage actually means in practice, your normal follow-up cadence, any
          convention worth knowing. This is included in every conversation, briefing, and daily email
          Orion writes, so it only needs to be said once.
        </p>
      </div>

      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={14}
        className="font-mono text-sm"
      />

      <div className="flex justify-end">
        <Button size="sm" onClick={handleSave} disabled={!isDirty || isSaving}>
          {isSaving ? <Loader2 className="animate-spin" /> : <Save className="size-3.5" />}
          Save
        </Button>
      </div>
    </div>
  );
}
