"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import {
  RESCHEDULE_QUICK_OPTIONS,
  rescheduleQuickTarget,
} from "@/components/leads/reschedule-follow-up-popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Sets the same next-follow-up date on every selected lead at once — the same quick periods as the single-lead reschedule popover, to avoid rescheduling one at a time. */
export function BulkRescheduleDialog({
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
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const count = leadIds.length;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setValue("");
  }

  async function apply(iso: string) {
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ next_follow_up_at: iso })
      .in("id", leadIds);
    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to reschedule", { description: error.message });
      return;
    }

    toast.success(`Rescheduled ${count} follow-up${count === 1 ? "" : "s"}`);
    handleOpenChange(false);
    onChanged();
  }

  function handleQuickPick(days: number) {
    apply(rescheduleQuickTarget(days).toISOString());
  }

  function handleCustomApply() {
    if (!value) return;
    apply(new Date(value).toISOString());
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Reschedule {count} follow-up{count === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Sets the same next follow-up date on every selected lead.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {RESCHEDULE_QUICK_OPTIONS.map((opt) => (
            <Button
              key={opt.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleQuickPick(opt.days)}
              disabled={isSubmitting || count === 0}
            >
              {isSubmitting && <Loader2 className="animate-spin" />}
              {opt.label}
            </Button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <Input
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={handleCustomApply}
            disabled={!value || isSubmitting || count === 0}
          >
            Set date
          </Button>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
