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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { CampaignWithSource } from "@/lib/queries/settings";

type LeadSource = { id: string; name: string };
const NONE = "none";

export function CampaignsPanel({
  campaigns,
  leadSources,
}: {
  campaigns: CampaignWithSource[];
  leadSources: LeadSource[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("");
  const [sourceId, setSourceId] = useState(NONE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<CampaignWithSource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const { error } = await supabase.from("campaigns").insert({
      name: name.trim(),
      channel: channel.trim() || null,
      lead_source_id: sourceId === NONE ? null : sourceId,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to add campaign", { description: error.message });
      return;
    }

    toast.success("Campaign added");
    setName("");
    setChannel("");
    setSourceId(NONE);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleting) return;
    setIsDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("campaigns").delete().eq("id", deleting.id);
    setIsDeleting(false);

    if (error) {
      toast.error("Failed to delete campaign", {
        description: error.message.includes("foreign key")
          ? "This campaign is still used by one or more leads."
          : error.message,
      });
      return;
    }

    toast.success("Campaign deleted");
    setDeleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
        <Input
          placeholder="Campaign name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-xs"
        />
        <Select value={sourceId} onValueChange={setSourceId}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Lead source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No source</SelectItem>
            {leadSources.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Channel (optional)"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="max-w-40"
        />
        <Button type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </form>

      <Card>
        <CardContent className="divide-y divide-border p-0">
          {campaigns.length === 0 && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No campaigns yet.
            </p>
          )}
          {campaigns.map((campaign) => (
            <div key={campaign.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{campaign.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[campaign.lead_source?.name, campaign.channel].filter(Boolean).join(" · ") ||
                    "No source or channel set"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeleting(campaign)}
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
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting && `"${deleting.name}" will be permanently removed.`}
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
