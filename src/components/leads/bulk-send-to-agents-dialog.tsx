"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Mail, MessageCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { buildBulkClientDetailsMessage } from "@/lib/leads";
import { toWhatsAppNumber } from "@/lib/format";
import type { ActivityType } from "@/lib/constants";
import type { LeadWithRelations } from "@/lib/queries/leads";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Agent = { id: string; name: string; phone: string | null; email: string | null };
type SendMethod = "whatsapp" | "email";

export function BulkSendToAgentsDialog({
  open,
  onOpenChange,
  leads,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: LeadWithRelations[];
}) {
  const router = useRouter();
  const profile = useProfile();
  const [sent, setSent] = useState<Record<string, SendMethod>>({});

  const groups = useMemo(() => {
    const byAgent = new Map<string, { agent: Agent; leads: LeadWithRelations[] }>();
    for (const lead of leads) {
      const agent = lead.assigned_agent;
      if (!agent) continue;
      const existing = byAgent.get(agent.id);
      if (existing) existing.leads.push(lead);
      else byAgent.set(agent.id, { agent, leads: [lead] });
    }
    return Array.from(byAgent.values());
  }, [leads]);

  const unassignedCount =
    leads.length - groups.reduce((total, group) => total + group.leads.length, 0);

  async function logSend(
    groupLeads: LeadWithRelations[],
    agentName: string,
    method: "WhatsApp" | "Email",
    type: ActivityType
  ) {
    const supabase = createClient();
    await supabase.from("activities").insert(
      groupLeads.map((lead) => ({
        lead_id: lead.id,
        type,
        body: `Client details sent to ${agentName} via ${method} (bulk send).`,
        created_by: profile?.id ?? null,
      }))
    );
    router.refresh();
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setSent({});
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Send {leads.length} lead{leads.length === 1 ? "" : "s"} to agents
          </DialogTitle>
          <DialogDescription>
            Grouped by assigned agent — one message per agent covering all their
            selected leads.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {groups.length === 0 && (
            <p className="text-sm text-muted-foreground">
              None of the selected leads have an assigned agent.
            </p>
          )}

          {groups.map(({ agent, leads: groupLeads }) => {
            const message = buildBulkClientDetailsMessage(groupLeads);
            const whatsappHref = agent.phone
              ? `https://wa.me/${toWhatsAppNumber(agent.phone)}?text=${encodeURIComponent(message)}`
              : undefined;
            const mailtoHref = agent.email
              ? `mailto:${agent.email}?subject=${encodeURIComponent(`${groupLeads.length} client leads`)}&body=${encodeURIComponent(message)}`
              : undefined;

            return (
              <div
                key={agent.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{agent.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {groupLeads.length} lead{groupLeads.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {whatsappHref ? (
                    <Button variant="outline" size="icon-sm" asChild>
                      <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Send to ${agent.name} via WhatsApp`}
                        onClick={() => {
                          logSend(groupLeads, agent.name, "WhatsApp", "whatsapp");
                          setSent((s) => ({ ...s, [agent.id]: "whatsapp" }));
                        }}
                      >
                        <MessageCircle className="size-3.5" />
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled
                      aria-label="No WhatsApp number on file"
                    >
                      <MessageCircle className="size-3.5" />
                    </Button>
                  )}
                  {mailtoHref ? (
                    <Button variant="outline" size="icon-sm" asChild>
                      <a
                        href={mailtoHref}
                        aria-label={`Send to ${agent.name} via email`}
                        onClick={() => {
                          logSend(groupLeads, agent.name, "Email", "email");
                          setSent((s) => ({ ...s, [agent.id]: "email" }));
                        }}
                      >
                        <Mail className="size-3.5" />
                      </a>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      disabled
                      aria-label="No email on file"
                    >
                      <Mail className="size-3.5" />
                    </Button>
                  )}
                  {sent[agent.id] && <Check className="size-3.5 text-gold" />}
                </div>
              </div>
            );
          })}

          {unassignedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {unassignedCount} selected lead{unassignedCount === 1 ? "" : "s"}{" "}
              skipped — no assigned agent.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
