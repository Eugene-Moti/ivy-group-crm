"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { DEFAULT_LEAD_COLUMN_LABELS, type LeadColumnId } from "@/lib/constants";
import type { LeadColumnLabels } from "@/lib/queries/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const COLUMN_IDS = Object.keys(DEFAULT_LEAD_COLUMN_LABELS) as LeadColumnId[];

export function ColumnLabelsPanel({ columnLabels }: { columnLabels: LeadColumnLabels }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<LeadColumnLabels>(columnLabels);
  const [savingId, setSavingId] = useState<LeadColumnId | null>(null);

  async function handleSave(columnId: LeadColumnId) {
    const label = drafts[columnId].trim();
    if (!label) return;

    setSavingId(columnId);
    const supabase = createClient();
    const { error } = await supabase
      .from("lead_column_labels")
      .upsert({ column_id: columnId, label }, { onConflict: "column_id" });
    setSavingId(null);

    if (error) {
      toast.error("Failed to save column label", { description: error.message });
      return;
    }

    toast.success("Column label updated");
    router.refresh();
  }

  function handleReset(columnId: LeadColumnId) {
    setDrafts((d) => ({ ...d, [columnId]: DEFAULT_LEAD_COLUMN_LABELS[columnId] }));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Rename what the leads table&apos;s column headers say. This only changes
        the label shown — it doesn&apos;t affect the underlying field or any
        exports/reports.
      </p>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {COLUMN_IDS.map((columnId) => {
            const draft = drafts[columnId];
            const saved = columnLabels[columnId];
            const isDirty = draft !== saved;
            const isDefault = draft === DEFAULT_LEAD_COLUMN_LABELS[columnId];

            return (
              <div
                key={columnId}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Input
                    value={draft}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [columnId]: e.target.value }))
                    }
                    className="max-w-56"
                  />
                  {!isDefault && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Reset to default"
                      onClick={() => handleReset(columnId)}
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!isDirty || !draft.trim() || savingId === columnId}
                  onClick={() => handleSave(columnId)}
                >
                  {savingId === columnId ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Save className="size-3.5" />
                  )}
                  Save
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
