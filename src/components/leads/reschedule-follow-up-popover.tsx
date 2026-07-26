"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { toDatetimeLocal } from "@/lib/leads-form";
import { formatDate } from "@/lib/format";
import { getFollowUpAlert } from "@/lib/leads";
import type { LeadStatus } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FollowUpAlertBadge } from "@/components/badges/follow-up-alert-badge";

export function RescheduleFollowUpPopover({
  leadId,
  status,
  nextFollowUpAt,
  readOnly = false,
}: {
  leadId: string;
  status: LeadStatus;
  nextFollowUpAt: string | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(toDatetimeLocal(nextFollowUpAt));
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({
        next_follow_up_at: value ? new Date(value).toISOString() : null,
      })
      .eq("id", leadId);
    setIsSaving(false);

    if (error) {
      toast.error("Failed to update follow-up", { description: error.message });
      return;
    }

    toast.success("Follow-up updated");
    setOpen(false);
    router.refresh();
  }

  const alert = getFollowUpAlert(nextFollowUpAt, status);

  const trigger = (
    <button
      type="button"
      disabled={readOnly}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-left transition-colors not-disabled:hover:border-ring/50 disabled:cursor-default"
    >
      <CalendarClock className="size-4 text-muted-foreground" />
      <span className="text-sm">{formatDate(nextFollowUpAt)}</span>
      <FollowUpAlertBadge alert={alert} />
    </button>
  );

  if (readOnly) return trigger;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-72 space-y-3">
        <p className="text-sm font-medium">Reschedule follow-up</p>
        <Input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          {nextFollowUpAt && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setValue("")}
              disabled={isSaving}
            >
              Clear
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
