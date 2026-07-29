"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
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
import type { LeadEvidenceWithAuthor } from "@/lib/queries/evidence";

export function EvidenceTimeline({
  evidence,
  isAdmin,
}: {
  evidence: LeadEvidenceWithAuthor[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<LeadEvidenceWithAuthor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const supabase = createClient();

    if (deleting.file_path) {
      await supabase.storage.from("lead-evidence").remove([deleting.file_path]);
    }
    const { error } = await supabase
      .from("lead_evidence")
      .delete()
      .eq("id", deleting.id);

    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete evidence", { description: error.message });
      return;
    }

    toast.success("Evidence deleted");
    setDeleting(null);
    router.refresh();
  }

  if (evidence.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        No evidence recorded yet.
      </div>
    );
  }

  return (
    <>
      <ol className="space-y-3">
        {evidence.map((item) => {
          const isImage = item.file_type?.startsWith("image/") ?? false;
          return (
            <li key={item.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {formatDate(item.occurred_at)}
                    </span>
                    {item.author?.full_name && (
                      <span>logged by {item.author.full_name}</span>
                    )}
                  </div>
                  {item.note && (
                    <p className="text-sm whitespace-pre-wrap">{item.note}</p>
                  )}
                  {item.signedUrl &&
                    (isImage ? (
                      <a href={item.signedUrl} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase Storage URL, not a static asset */}
                        <img
                          src={item.signedUrl}
                          alt={item.file_name ?? "Evidence screenshot"}
                          className="max-h-48 rounded-lg border border-border object-contain"
                        />
                      </a>
                    ) : (
                      <a
                        href={item.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-gold hover:underline"
                      >
                        <FileText className="size-4" />
                        {item.file_name ?? "Attached file"}
                      </a>
                    ))}
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete evidence"
                    onClick={() => setDeleting(item)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this evidence?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the note
              {deleting?.file_path ? " and attached file" : ""}. This cannot be undone.
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
