"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { buildClientDetailsMessage } from "@/lib/leads";
import { fullName, toWhatsAppNumber } from "@/lib/format";
import type { ActivityType } from "@/lib/constants";
import type { LeadWithRelations } from "@/lib/queries/leads";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SendToAgentMenu({ lead }: { lead: LeadWithRelations }) {
  const router = useRouter();
  const profile = useProfile();
  const [isLogging, setIsLogging] = useState(false);

  const agent = lead.assigned_agent;
  if (!agent) return null;

  async function logSend(method: "WhatsApp" | "Email", type: ActivityType) {
    setIsLogging(true);
    const supabase = createClient();
    await supabase.from("activities").insert({
      lead_id: lead.id,
      type,
      body: `Client details sent to ${agent!.name} via ${method}.`,
      created_by: profile?.id ?? null,
    });
    setIsLogging(false);
    toast.success(`Sent to ${agent!.name}`);
    router.refresh();
  }

  function handleWhatsApp() {
    if (!agent?.phone) return;
    const message = buildClientDetailsMessage(lead);
    window.open(
      `https://wa.me/${toWhatsAppNumber(agent.phone)}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
    logSend("WhatsApp", "whatsapp");
  }

  function handleEmail() {
    if (!agent?.email) return;
    const message = buildClientDetailsMessage(lead);
    const subject = `Client lead: ${fullName(lead)}`;
    window.location.href = `mailto:${agent.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    logSend("Email", "email");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLogging}>
          <Send className="size-4" />
          Send to {agent.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={!agent.phone} onClick={handleWhatsApp}>
          <MessageCircle />
          Send via WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!agent.email} onClick={handleEmail}>
          <Mail />
          Send via Email
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
