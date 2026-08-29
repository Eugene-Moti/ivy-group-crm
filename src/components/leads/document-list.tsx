"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
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
import type { LeadDocumentWithAuthor } from "@/lib/queries/documents";

export function DocumentList({
  documents,
  isAdmin,
}: {
  documents: LeadDocumentWithAuthor[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<LeadDocumentWithAuthor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const supabase = createClient();

    await supabase.storage.from("lead-documents").remove([deleting.file_path]);
    const { error } = await supabase.from("lead_documents").delete().eq("id", deleting.id);

    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete document", { description: error.message });
      return;
    }

    toast.success("Document deleted");
    setDeleting(null);
    router.refresh();
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
        No documents uploaded yet.
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{doc.document_type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(doc.created_at)}
                  {doc.author?.full_name ? ` · uploaded by ${doc.author.full_name}` : ""}
                </span>
              </div>
              {doc.note && <p className="text-sm whitespace-pre-wrap">{doc.note}</p>}
              {doc.signedUrl && (
                <a
                  href={doc.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-gold hover:underline"
                >
                  <FileText className="size-4" />
                  {doc.file_name}
                </a>
              )}
            </div>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete document"
                onClick={() => setDeleting(doc)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            )}
          </li>
        ))}
      </ul>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes &quot;{deleting?.file_name}&quot;. This cannot be undone.
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
