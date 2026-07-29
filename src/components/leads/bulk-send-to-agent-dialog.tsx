"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Mail, MessageCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { buildBulkClientDetailsMessage } from "@/lib/leads";
import { fullName, toWhatsAppNumber } from "@/lib/format";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Agent = { id: string; name: string; phone: string | null; email: string | null };

export function BulkSendToAgentDialog({
  open,
  onOpenChange,
  leads,
  agents,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: LeadWithRelations[];
  agents: Agent[];
}) {
  const router = useRouter();
  const profile = useProfile();
  const [agentId, setAgentId] = useState("");
  const [sentVia, setSentVia] = useState<"whatsapp" | "email" | null>(null);

  const agent = agents.find((a) => a.id === agentId) ?? null;

  const mismatched = useMemo(
    () =>
      agent
        ? leads.filter((lead) => lead.assigned_agent && lead.assigned_agent.id !== agent.id)
        : [],
    [leads, agent]
  );

  const message = useMemo(() => buildBulkClientDetailsMessage(leads), [leads]);
  const whatsappHref =
    agent?.phone && `https://wa.me/${toWhatsAppNumber(agent.phone)}?text=${encodeURIComponent(message)}`;
  const mailtoHref =
    agent?.email &&
    `mailto:${agent.email}?subject=${encodeURIComponent(`${leads.length} client leads`)}&body=${encodeURIComponent(message)}`;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setAgentId("");
      setSentVia(null);
    }
  }

  async function logSend(method: "WhatsApp" | "Email", type: ActivityType) {
    if (!agent) return;
    const supabase = createClient();
    await supabase.from("activities").insert(
      leads.map((lead) => ({
        lead_id: lead.id,
        type,
        body: `Client details sent to ${agent.name} via ${method} (bulk send).`,
        created_by: profile?.id ?? null,
      }))
    );
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Send {leads.length} lead{leads.length === 1 ? "" : "s"} to a sales manager
          </DialogTitle>
          <DialogDescription>
            Choose who should receive these client details — this doesn&apos;t
            have to be who they&apos;re currently assigned to.
          </DialogDescription>
        </DialogHeader>

        <Select value={agentId} onValueChange={(v) => { setAgentId(v); setSentVia(null); }}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a sales manager" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {agent && mismatched.length > 0 && (
          <div className="flex gap-2 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" />
            <p>
              {mismatched.length} of the selected leads{" "}
              {mismatched.length === 1 ? "is" : "are"} currently assigned to a{" "}
              <strong>different</strong> sales manager — you&apos;re about to send{" "}
              {mismatched.length === 1 ? "it" : "them"} to {agent.name} instead:{" "}
              {mismatched.map((lead) => fullName(lead)).join(", ")}.
            </p>
          </div>
        )}

        {agent && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!whatsappHref}
              asChild={!!whatsappHref}
            >
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    logSend("WhatsApp", "whatsapp");
                    setSentVia("whatsapp");
                  }}
                >
                  <MessageCircle className="size-4" />
                  WhatsApp
                </a>
              ) : (
                <>
                  <MessageCircle className="size-4" />
                  WhatsApp
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={!mailtoHref}
              asChild={!!mailtoHref}
            >
              {mailtoHref ? (
                <a
                  href={mailtoHref}
                  onClick={() => {
                    logSend("Email", "email");
                    setSentVia("email");
                  }}
                >
                  <Mail className="size-4" />
                  Email
                </a>
              ) : (
                <>
                  <Mail className="size-4" />
                  Email
                </>
              )}
            </Button>
          </div>
        )}

        {sentVia && (
          <p className="text-sm text-muted-foreground">
            Sent to {agent?.name} via {sentVia === "whatsapp" ? "WhatsApp" : "email"}.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
