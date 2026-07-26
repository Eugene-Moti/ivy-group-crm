"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import type { ReportFilters } from "@/lib/report-metrics";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function SaveQueryDialog({ filters }: { filters: ReportFilters }) {
  const router = useRouter();
  const profile = useProfile();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      toast.error("Give this query a name.");
      return;
    }

    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("saved_queries").insert({
      name: name.trim(),
      filters,
      created_by: profile?.id ?? null,
    });
    setIsSaving(false);

    if (error) {
      toast.error("Failed to save query", { description: error.message });
      return;
    }

    toast.success("Query saved");
    setName("");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Save className="size-4" />
          Save query
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save this query</DialogTitle>
          <DialogDescription>
            Save the current filters so your team can load them again later.
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="e.g. Hot leads in Kilimani"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
