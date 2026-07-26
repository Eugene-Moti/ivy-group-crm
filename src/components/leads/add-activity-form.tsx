"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { ACTIVITY_TYPE_META, CONTACT_ACTIVITY_TYPES, LOGGABLE_ACTIVITY_TYPES } from "@/lib/activity";
import type { ActivityType } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AddActivityForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const profile = useProfile();
  const [type, setType] = useState<ActivityType>("note");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      toast.error("Add a note before logging this activity.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    const { error: activityError } = await supabase.from("activities").insert({
      lead_id: leadId,
      type,
      body: body.trim(),
      created_by: profile?.id ?? null,
    });

    if (activityError) {
      setIsSubmitting(false);
      toast.error("Failed to log activity", { description: activityError.message });
      return;
    }

    if (CONTACT_ACTIVITY_TYPES.includes(type)) {
      await supabase
        .from("leads")
        .update({ last_contact_at: new Date().toISOString() })
        .eq("id", leadId);
    }

    setIsSubmitting(false);
    setBody("");
    setType("note");
    toast.success("Activity logged");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Select value={type} onValueChange={(v) => setType(v as ActivityType)}>
          <SelectTrigger size="sm" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOGGABLE_ACTIVITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ACTIVITY_TYPE_META[t].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Log an activity</span>
      </div>
      <Textarea
        placeholder="What happened?"
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Send />}
          Log activity
        </Button>
      </div>
    </form>
  );
}
