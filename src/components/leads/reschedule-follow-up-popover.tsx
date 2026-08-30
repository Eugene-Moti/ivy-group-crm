"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDays, startOfDay } from "date-fns";
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

const NINE_AM_HOURS = 9;

/** A same "tomorrow at 9am" style target, not the exact minute right now — reads better than a random time-of-day. */
function quickTarget(daysFromToday: number): Date {
  const d = startOfDay(addDays(new Date(), daysFromToday));
  d.setHours(NINE_AM_HOURS, 0, 0, 0);
  return d;
}

export const RESCHEDULE_QUICK_OPTIONS: { label: string; days: number }[] = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "In 1 week", days: 7 },
  { label: "In 2 weeks", days: 14 },
];

export function rescheduleQuickTarget(days: number): Date {
  return quickTarget(days);
}

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

  async function handleSave(override?: string) {
    const toSave = override ?? value;
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({
        next_follow_up_at: toSave ? new Date(toSave).toISOString() : null,
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

  function handleQuickPick(days: number) {
    const iso = rescheduleQuickTarget(days).toISOString();
    setValue(toDatetimeLocal(iso));
    handleSave(iso);
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
        <div className="flex flex-wrap gap-1.5">
          {RESCHEDULE_QUICK_OPTIONS.map((opt) => (
            <Button
              key={opt.label}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs"
              onClick={() => handleQuickPick(opt.days)}
              disabled={isSaving}
            >
              {opt.label}
            </Button>
          ))}
        </div>
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
          <Button size="sm" onClick={() => handleSave()} disabled={isSaving}>
            {isSaving && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
