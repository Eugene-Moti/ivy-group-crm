"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
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

export function BulkDeleteLeadsDialog({
  open,
  onOpenChange,
  leadIds,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadIds: string[];
  onDeleted: () => void;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const count = leadIds.length;

  async function handleDelete() {
    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("leads").delete().in("id", leadIds);
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete leads", { description: error.message });
      return;
    }

    toast.success(`${count} lead${count === 1 ? "" : "s"} deleted`);
    onOpenChange(false);
    onDeleted();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {count} lead{count === 1 ? "" : "s"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the selected leads and their activity
            history. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting || count === 0}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isDeleting && <Loader2 className="animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
