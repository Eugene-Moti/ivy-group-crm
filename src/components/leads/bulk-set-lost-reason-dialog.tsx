"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { LOST_REASONS, LOST_STATUS_KEY, type LostReason } from "@/lib/constants";
import { fullName } from "@/lib/format";
import type { LeadWithRelations } from "@/lib/queries/leads";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";

/**
 * For backfilling a reason onto leads that were already marked Closed - Lost
 * before reason capture existed (or were lost without one at the time).
 * Only applies to leads in the selection that are actually Closed - Lost —
 * anything else selected is skipped and called out, not silently changed.
 */
export function BulkSetLostReasonDialog({
  open,
  onOpenChange,
  leads,
  onApplied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leads: LeadWithRelations[];
  onApplied: () => void;
}) {
  const [reason, setReason] = useState<LostReason | "">("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const lostLeads = useMemo(() => leads.filter((l) => l.status === LOST_STATUS_KEY), [leads]);
  const notLostLeads = useMemo(() => leads.filter((l) => l.status !== LOST_STATUS_KEY), [leads]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setReason("");
      setNote("");
    }
  }

  async function handleApply() {
    if (!reason || lostLeads.length === 0) return;
    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("leads")
      .update({ lost_reason: reason, lost_reason_note: note.trim() || null })
      .in(
        "id",
        lostLeads.map((l) => l.id)
      );
    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to set lost reason", { description: error.message });
      return;
    }

    toast.success(
      `Set "${reason}" on ${lostLeads.length} lost lead${lostLeads.length === 1 ? "" : "s"}`
    );
    handleOpenChange(false);
    onApplied();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Set lost reason for {lostLeads.length} lead{lostLeads.length === 1 ? "" : "s"}
          </DialogTitle>
          <DialogDescription>
            Applies the same reason to every Closed - Lost lead in your selection —
            useful for backfilling older leads that were lost before reasons were
            tracked.
          </DialogDescription>
        </DialogHeader>

        {notLostLeads.length > 0 && (
          <div className="flex gap-2 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" />
            <p>
              {notLostLeads.length} of the selected leads{" "}
              {notLostLeads.length === 1 ? "isn't" : "aren't"} Closed - Lost and will be
              skipped: {notLostLeads.map((lead) => fullName(lead)).join(", ")}.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Field>
            <FieldLabel>Reason</FieldLabel>
            <FieldContent>
              <Select value={reason} onValueChange={(v) => setReason(v as LostReason)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {LOST_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="bulk-lost-reason-note">Details (optional)</FieldLabel>
            <FieldContent>
              <Input
                id="bulk-lost-reason-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </FieldContent>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!reason || lostLeads.length === 0 || isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
