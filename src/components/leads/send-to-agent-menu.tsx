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

  const message = buildClientDetailsMessage(lead);
  const whatsappHref = agent.phone
    ? `https://wa.me/${toWhatsAppNumber(agent.phone)}?text=${encodeURIComponent(message)}`
    : undefined;
  const mailtoHref = agent.email
    ? `mailto:${agent.email}?subject=${encodeURIComponent(`Client lead: ${fullName(lead)}`)}&body=${encodeURIComponent(message)}`
    : undefined;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLogging}>
          <Send className="size-4" />
          Send to {agent.name}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild disabled={!agent.phone}>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => logSend("WhatsApp", "whatsapp")}
          >
            <MessageCircle />
            Send via WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild disabled={!agent.email}>
          <a href={mailtoHref} onClick={() => logSend("Email", "email")}>
            <Mail />
            Send via Email
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
