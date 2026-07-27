"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { DEFAULT_STATUS_LABELS, LEAD_STATUSES, type LeadStatus } from "@/lib/constants";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export function StatusLabelsPanel() {
  const router = useRouter();
  const statusLabels = useStatusLabels();
  const [drafts, setDrafts] = useState(statusLabels);
  const [savingStatus, setSavingStatus] = useState<LeadStatus | null>(null);

  async function handleSave(status: LeadStatus) {
    const label = drafts[status].trim();
    if (!label) return;

    setSavingStatus(status);
    const supabase = createClient();
    const { error } = await supabase
      .from("status_labels")
      .upsert({ status, label }, { onConflict: "status" });
    setSavingStatus(null);

    if (error) {
      toast.error("Failed to save status label", { description: error.message });
      return;
    }

    toast.success("Status label updated");
    router.refresh();
  }

  function handleReset(status: LeadStatus) {
    setDrafts((d) => ({ ...d, [status]: DEFAULT_STATUS_LABELS[status] }));
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Rename what each pipeline stage is called — in the Kanban board, badges,
        filters, and reports. The stage itself (its order, color, and whether it
        counts as a closed deal) doesn&apos;t change, only the label shown.
      </p>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {LEAD_STATUSES.map((status) => {
            const draft = drafts[status];
            const saved = statusLabels[status];
            const isDirty = draft !== saved;
            const isDefault = draft === DEFAULT_STATUS_LABELS[status];

            return (
              <div
                key={status}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Input
                    value={draft}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [status]: e.target.value }))
                    }
                    className="max-w-56"
                  />
                  {!isDefault && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Reset to default"
                      onClick={() => handleReset(status)}
                    >
                      <RotateCcw className="size-3.5" />
                    </Button>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!isDirty || !draft.trim() || savingStatus === status}
                  onClick={() => handleSave(status)}
                >
                  {savingStatus === status ? (
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
