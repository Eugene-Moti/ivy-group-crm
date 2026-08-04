"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { ACTIVITY_TYPE_META } from "@/lib/activity";
import { formatDateTime, formatRelative } from "@/lib/format";
import { hexToRgba } from "@/lib/color";
import { Button } from "@/components/ui/button";
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
import type { ActivityWithAuthor } from "@/lib/queries/activities";

export function ActivityTimeline({
  activities,
  isAdmin = false,
}: {
  activities: ActivityWithAuthor[];
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<ActivityWithAuthor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("activities").delete().eq("id", deleting.id);
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete note", { description: error.message });
      return;
    }

    toast.success("Note deleted");
    setDeleting(null);
    router.refresh();
  }

  if (!activities.length) {
    return (
      <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        No activity yet.
      </div>
    );
  }

  return (
    <>
      <ol className="space-y-4">
        {activities.map((activity) => {
          const meta = ACTIVITY_TYPE_META[activity.type];
          const Icon = meta.icon;
          const canDelete = isAdmin && activity.type !== "status_change";
          return (
            <li key={activity.id} className="flex gap-3">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: hexToRgba(meta.color, 0.15),
                  color: meta.color,
                }}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                  <span className="text-sm font-medium">{meta.label}</span>
                  <div className="flex items-center gap-1">
                    <span
                      className="text-xs text-muted-foreground"
                      title={formatDateTime(activity.created_at)}
                    >
                      {formatRelative(activity.created_at)}
                    </span>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Delete note"
                        className="size-5"
                        onClick={() => setDeleting(activity)}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                {activity.body && (
                  <p className="mt-0.5 text-sm text-muted-foreground whitespace-pre-wrap">
                    {activity.body}
                  </p>
                )}
                {activity.author?.full_name && (
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    by {activity.author.full_name}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes it from the communication timeline and any
              ownership report. This cannot be undone — if it was logged
              incorrectly, delete it and log it again with the correct details.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
