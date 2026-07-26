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

type PropertyType = { id: string; name: string };

export function PropertyTypesPanel({ propertyTypes }: { propertyTypes: PropertyType[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<PropertyType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("property_types").insert({ name: name.trim() });
    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to add property type", { description: error.message });
      return;
    }

    toast.success("Property type added");
    setName("");
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("property_types").delete().eq("id", deleting.id);
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete property type", {
        description: error.message.includes("foreign key")
          ? "This property type is still used by one or more leads."
          : error.message,
      });
      return;
    }

    toast.success("Property type deleted");
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          placeholder="New property type name"
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
          {propertyTypes.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No property types yet.
            </p>
          )}
          {propertyTypes.map((type) => (
            <div key={type.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm font-medium">{type.name}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleting(type)}
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
            <AlertDialogTitle>Delete property type?</AlertDialogTitle>
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
