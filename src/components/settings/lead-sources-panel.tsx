"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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

type LeadSource = { id: string; name: string };

export function LeadSourcesPanel({ leadSources }: { leadSources: LeadSource[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<LeadSource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("lead_sources").insert({ name: name.trim() });
    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to add lead source", { description: error.message });
      return;
    }

    toast.success("Lead source added");
    setName("");
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("lead_sources").delete().eq("id", deleting.id);
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete lead source", {
        description: error.message.includes("foreign key")
          ? "This source is still used by one or more leads."
          : error.message,
      });
      return;
    }

    toast.success("Lead source deleted");
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          placeholder="New lead source name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </form>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {leadSources.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No lead sources yet.
            </p>
          )}
          {leadSources.map((source) => (
            <div key={source.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">{source.name}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleting(source)}
              >
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead source?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                `"${deleting.name}" will be removed. Leads already using it keep their existing value but you won't be able to select it for new leads.`}
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
    </div>
  );
}
