"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
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

type Project = { id: string; name: string; location: string | null };
type Draft = { name: string; location: string };

export function ProjectsPanel({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(
    Object.fromEntries(
      projects.map((p) => [p.id, { name: p.name, location: p.location ?? "" }])
    )
  );
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function draftFor(project: Project): Draft {
    return drafts[project.id] ?? { name: project.name, location: project.location ?? "" };
  }

  function setDraft(project: Project, patch: Partial<Draft>) {
    const base = draftFor(project);
    setDrafts((d) => ({ ...d, [project.id]: { ...base, ...patch } }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsAdding(true);
    const supabase = createClient();
    const { error } = await supabase.from("property_types").insert({
      name: newName.trim(),
      location: newLocation.trim() || null,
    });
    setIsAdding(false);

    if (error) {
      toast.error("Failed to add project", { description: error.message });
      return;
    }

    toast.success("Project added");
    setNewName("");
    setNewLocation("");
    router.refresh();
  }

  async function handleSave(project: Project) {
    const draft = draftFor(project);
    if (!draft.name.trim()) return;

    setSavingId(project.id);
    const supabase = createClient();
    const { error } = await supabase
      .from("property_types")
      .update({ name: draft.name.trim(), location: draft.location.trim() || null })
      .eq("id", project.id);
    setSavingId(null);

    if (error) {
      toast.error("Failed to save project", { description: error.message });
      return;
    }

    toast.success("Project updated");
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("property_types").delete().eq("id", deleting.id);
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete project", {
        description: error.message.includes("foreign key")
          ? "This project is still used by one or more leads — reassign or remove those leads first."
          : error.message,
      });
      return;
    }

    toast.success("Project deleted");
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage the developments the team sells — Ivy Park, Ivy Myst, and so on.
        Each project has a fixed location, which auto-fills on the lead form
        when that project is selected.
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <Input
          placeholder="Project name (e.g. Ivy Park)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="max-w-56"
        />
        <Input
          placeholder="Location (e.g. Kilimani)"
          value={newLocation}
          onChange={(e) => setNewLocation(e.target.value)}
          className="max-w-56"
        />
        <Button type="submit" disabled={isAdding || !newName.trim()}>
          {isAdding ? <Loader2 className="animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </form>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {projects.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No projects yet.
            </p>
          )}
          {projects.map((project) => {
            const draft = draftFor(project);
            const isDirty =
              draft.name !== project.name || draft.location !== (project.location ?? "");

            return (
              <div
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft(project, { name: e.target.value })}
                    className="max-w-56"
                  />
                  <Input
                    value={draft.location}
                    onChange={(e) => setDraft(project, { location: e.target.value })}
                    placeholder="Location"
                    className="max-w-56"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!isDirty || !draft.name.trim() || savingId === project.id}
                    onClick={() => handleSave(project)}
                  >
                    {savingId === project.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleting(project)}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                `"${deleting.name}" will be removed. If any leads still reference it, deletion will be blocked until those leads are reassigned to a different project or removed.`}
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
