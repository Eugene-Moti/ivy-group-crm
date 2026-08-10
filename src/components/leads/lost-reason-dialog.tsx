"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { LOST_REASONS } from "@/lib/constants";
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

/** Captured before a lead is dropped into Closed - Lost on the Kanban board — cancel leaves the card exactly where it was. */
export function LostReasonDialog({
  open,
  onOpenChange,
  leadName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  onConfirm: (reason: string, note: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function reset() {
    setReason("");
    setNote("");
    setIsSubmitting(false);
  }

  async function handleConfirm() {
    if (!reason) return;
    setIsSubmitting(true);
    await onConfirm(reason, note);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Why was {leadName} lost?</DialogTitle>
          <DialogDescription>
            Captured now so patterns in lost deals show up in the Lost Leads report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field>
            <FieldLabel>Reason</FieldLabel>
            <FieldContent>
              <Select value={reason} onValueChange={setReason}>
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
            <FieldLabel htmlFor="lost-reason-note">Details (optional)</FieldLabel>
            <FieldContent>
              <Input id="lost-reason-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </FieldContent>
          </Field>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!reason || isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
