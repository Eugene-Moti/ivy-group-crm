"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import type { LeadReminderRow } from "@/lib/queries/reminders";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Site-visit / meeting reminders for this lead — surfaced in Orion's daily
 * 9am briefing email the day they're due, not a real-time push (see
 * src/lib/orion.ts's nairobiDayBounds). Kept deliberately separate from
 * next_follow_up_at, which drives the Follow-ups page and its own alerts.
 */
export function LeadReminders({
  leadId,
  reminders,
  isAdmin,
}: {
  leadId: string;
  reminders: LeadReminderRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<LeadReminderRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !remindAt) {
      toast.error("A title and a date/time are required.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("lead_reminders").insert({
      lead_id: leadId,
      title: title.trim(),
      notes: notes.trim() || null,
      remind_at: new Date(remindAt).toISOString(),
    });
    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to schedule reminder", { description: error.message });
      return;
    }

    setTitle("");
    setRemindAt("");
    setNotes("");
    toast.success("Reminder scheduled — Orion will mention it in the briefing that morning.");
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("lead_reminders").delete().eq("id", deleting.id);
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to cancel reminder", { description: error.message });
      return;
    }

    toast.success("Reminder cancelled");
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
        Site visit / meeting reminders
      </h2>

      {reminders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reminders scheduled for this lead.</p>
      ) : (
        <ul className="space-y-2">
          {reminders.map((r) => (
            <li
              key={r.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="flex min-w-0 gap-2.5">
                <CalendarClock className="mt-0.5 size-4 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(r.remind_at)}</p>
                  {r.notes && <p className="mt-1 text-sm text-muted-foreground">{r.notes}</p>}
                </div>
              </div>
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setDeleting(r)}
                  aria-label="Cancel reminder"
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isAdmin && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input
              placeholder="e.g. Site visit"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
            />
          </div>
          <Textarea
            placeholder="Optional notes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus />}
              Schedule reminder
            </Button>
          </div>
        </form>
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this reminder?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && `"${deleting.title}" on ${formatDateTime(deleting.remind_at)} will be removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="animate-spin" />}
              Cancel reminder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
