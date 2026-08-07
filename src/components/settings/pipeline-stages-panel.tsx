"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Lock, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { usePipelineStages } from "@/components/providers/status-labels-provider";
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
import type { PipelineStage } from "@/lib/queries/settings";

type Draft = { label: string; color: string };

function slugify(label: string, existingKeys: Set<string>): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "stage";
  let key = base;
  let n = 2;
  while (existingKeys.has(key)) {
    key = `${base}_${n}`;
    n += 1;
  }
  return key;
}

export function PipelineStagesPanel() {
  const router = useRouter();
  const stages = usePipelineStages();
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#7A8B84");
  const [isAdding, setIsAdding] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(
    Object.fromEntries(stages.map((s) => [s.key, { label: s.label, color: s.color }]))
  );
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [movingKey, setMovingKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<PipelineStage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  function draftFor(stage: PipelineStage): Draft {
    return drafts[stage.key] ?? { label: stage.label, color: stage.color };
  }

  function setDraft(stage: PipelineStage, patch: Partial<Draft>) {
    const base = draftFor(stage);
    setDrafts((d) => ({ ...d, [stage.key]: { ...base, ...patch } }));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;

    setIsAdding(true);
    const supabase = createClient();
    const key = slugify(newLabel, new Set(stages.map((s) => s.key)));
    const maxSortOrder = Math.max(0, ...stages.map((s) => s.sort_order));

    const { error } = await supabase.from("pipeline_stages").insert({
      key,
      label: newLabel.trim(),
      color: newColor,
      sort_order: maxSortOrder + 1,
    });
    setIsAdding(false);

    if (error) {
      toast.error("Failed to add stage", { description: error.message });
      return;
    }

    toast.success("Stage added");
    setNewLabel("");
    setNewColor("#7A8B84");
    router.refresh();
  }

  async function handleSave(stage: PipelineStage) {
    const draft = draftFor(stage);
    if (!draft.label.trim()) return;

    setSavingKey(stage.key);
    const supabase = createClient();
    const { error } = await supabase
      .from("pipeline_stages")
      .update({ label: draft.label.trim(), color: draft.color })
      .eq("key", stage.key);
    setSavingKey(null);

    if (error) {
      toast.error("Failed to save stage", { description: error.message });
      return;
    }

    toast.success("Stage updated");
    router.refresh();
  }

  async function handleMove(stage: PipelineStage, direction: "up" | "down") {
    const sorted = [...stages].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex((s) => s.key === stage.key);
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;

    const other = sorted[swapIndex];
    setMovingKey(stage.key);
    const supabase = createClient();
    const [{ error: error1 }, { error: error2 }] = await Promise.all([
      supabase
        .from("pipeline_stages")
        .update({ sort_order: other.sort_order })
        .eq("key", stage.key),
      supabase
        .from("pipeline_stages")
        .update({ sort_order: stage.sort_order })
        .eq("key", other.key),
    ]);
    setMovingKey(null);

    if (error1 || error2) {
      toast.error("Failed to reorder stages", { description: error1?.message ?? error2?.message });
      return;
    }

    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("pipeline_stages").delete().eq("key", deleting.key);
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete stage", {
        description: error.message.includes("foreign key")
          ? "This stage is still used by one or more leads — move them to a different stage first."
          : error.message,
      });
      return;
    }

    toast.success("Stage deleted");
    setDeleting(null);
    router.refresh();
  }

  const sortedStages = [...stages].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add, rename, recolor, reorder, or remove pipeline stages — shown everywhere
        status appears (Kanban, badges, filters, reports, PDF exports). &quot;New
        Lead&quot;, &quot;Closed - Won&quot;, and &quot;Closed - Lost&quot; are
        protected — they can be renamed, but not removed, since conversion rate and
        follow-up alerts depend on them.
      </p>

      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="New stage name (e.g. Meeting Scheduled)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="max-w-64"
        />
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-md border border-border"
          aria-label="Stage color"
        />
        <Button type="submit" disabled={isAdding || !newLabel.trim()}>
          {isAdding ? <Loader2 className="animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </form>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {sortedStages.map((stage, i) => {
            const draft = draftFor(stage);
            const isDirty = draft.label !== stage.label || draft.color !== stage.color;

            return (
              <div
                key={stage.key}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                  <input
                    type="color"
                    value={draft.color}
                    onChange={(e) => setDraft(stage, { color: e.target.value })}
                    className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-border"
                    aria-label={`${stage.label} color`}
                  />
                  <Input
                    value={draft.label}
                    onChange={(e) => setDraft(stage, { label: e.target.value })}
                    className="max-w-56"
                  />
                  {stage.is_protected && (
                    <span
                      className="flex items-center gap-1 text-xs text-muted-foreground"
                      title="Protected stage — cannot be deleted"
                    >
                      <Lock className="size-3" />
                      Protected
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move up"
                    disabled={i === 0 || movingKey !== null}
                    onClick={() => handleMove(stage, "up")}
                  >
                    <ArrowUp className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Move down"
                    disabled={i === sortedStages.length - 1 || movingKey !== null}
                    onClick={() => handleMove(stage, "down")}
                  >
                    <ArrowDown className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!isDirty || !draft.label.trim() || savingKey === stage.key}
                    onClick={() => handleSave(stage)}
                  >
                    {savingKey === stage.key ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete stage"
                    disabled={stage.is_protected}
                    onClick={() => setDeleting(stage)}
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
            <AlertDialogTitle>Delete stage?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                `"${deleting.label}" will be removed. If any leads are still in this stage, deletion will be blocked until they're moved to a different one.`}
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
