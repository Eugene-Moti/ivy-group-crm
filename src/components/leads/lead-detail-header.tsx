"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { QuickContactActions } from "@/components/leads/quick-contact-actions";
import { DeleteLeadDialog } from "@/components/leads/delete-lead-dialog";
import { SendToAgentMenu } from "@/components/leads/send-to-agent-menu";
import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

export function LeadDetailHeader({
  lead,
  isAdmin,
  isEditing,
  onToggleEdit,
}: {
  lead: LeadWithRelations;
  isAdmin: boolean;
  isEditing: boolean;
  onToggleEdit: () => void;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const name = fullName(lead);

  return (
    <div className="space-y-4">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to directory
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            <AvatarFallback className="bg-gold text-base font-semibold text-ink">
              {name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <PriorityBadge priority={lead.priority} />
              <StatusBadge status={lead.status} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-1">
          <QuickContactActions phone={lead.phone} email={lead.email} />
          {isAdmin && (
            <>
              <SendToAgentMenu lead={lead} />
              <Button variant="outline" size="sm" onClick={onToggleEdit}>
                {isEditing ? <X className="size-4" /> : <Pencil className="size-4" />}
                {isEditing ? "Cancel" : "Edit"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4 text-destructive" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <DeleteLeadDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        lead={lead}
        onDeleted={() => router.push("/leads")}
      />
    </div>
  );
}
