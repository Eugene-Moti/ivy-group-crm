"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LEAD_PRIORITIES, type LeadPriority } from "@/lib/constants";
import { PriorityBadge } from "@/components/badges/priority-badge";
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

export function BulkChangePriorityDialog({
  open,
  onOpenChange,
  leadIds,
  onChanged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  onChanged: () => void;
}) {
  const [priority, setPriority] = useState<LeadPriority | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const count = leadIds.length;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setPriority("");
  }

  async function handleApply() {
    if (!priority) return;
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ priority })
      .in("id", leadIds);
    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to update priority", { description: error.message });
      return;
    }

    toast.success(`Set ${count} lead${count === 1 ? "" : "s"} to ${priority} priority`);
    handleOpenChange(false);
    onChanged();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Change priority for {count} lead{count === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            This replaces the current priority on every selected lead.
          </DialogDescription>
        </DialogHeader>

        <Select value={priority} onValueChange={(v) => setPriority(v as LeadPriority)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a priority" />
          </SelectTrigger>
          <SelectContent>
            {LEAD_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                <PriorityBadge priority={p} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!priority || isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
