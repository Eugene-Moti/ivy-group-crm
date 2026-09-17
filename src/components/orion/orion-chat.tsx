"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { OrionChatBody } from "@/components/orion/orion-chat-body";
import { useIsAdmin } from "@/components/providers/profile-provider";

const STARTER_PROMPTS = [
  "Give me a deep-dive on the pipeline this week",
  "Which leads are at real risk of going cold?",
  "How is each sales manager tracking against their pipeline?",
  "Draft a plan to win back our best lost leads",
];

export function OrionChat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isAdmin = useIsAdmin();
  const askedPrompt = searchParams.get("ask") ?? undefined;

  return (
    <OrionChatBody
      starterPrompts={STARTER_PROMPTS}
      headerTitle="Ask Orion"
      headerDescription={`Talk through the pipeline, individual leads, or what to do next — grounded in live CRM data.${isAdmin ? " Orion can draft changes too, but nothing is applied until you confirm it." : ""}`}
      initialPrompt={askedPrompt}
      onConsumeInitialPrompt={() => router.replace("/orion", { scroll: false })}
      placeholder="Ask Orion about your leads, pipeline, or what needs attention…"
    />
  );
}
