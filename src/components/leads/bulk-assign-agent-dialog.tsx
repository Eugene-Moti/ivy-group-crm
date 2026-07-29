"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
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

type AgentOption = { id: string; name: string };

export function BulkAssignAgentDialog({
  open,
  onOpenChange,
  leadIds,
  agents,
  onAssigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  agents: AgentOption[];
  onAssigned: () => void;
}) {
  const [agentId, setAgentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const count = leadIds.length;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setAgentId("");
  }

  async function handleAssign() {
    if (!agentId) return;
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ assigned_to: agentId })
      .in("id", leadIds);
    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to assign sales manager", { description: error.message });
      return;
    }

    const agentName = agents.find((a) => a.id === agentId)?.name ?? "the sales manager";
    toast.success(`Assigned ${count} lead${count === 1 ? "" : "s"} to ${agentName}`);
    handleOpenChange(false);
    onAssigned();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Assign {count} lead{count === 1 ? "" : "s"} to a sales manager
          </DialogTitle>
          <DialogDescription>
            This replaces the currently assigned sales manager, if any, on every
            selected lead.
          </DialogDescription>
        </DialogHeader>

        <Select value={agentId} onValueChange={setAgentId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a sales manager" />
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!agentId || isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
