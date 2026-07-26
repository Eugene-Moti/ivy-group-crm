"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { ACTIVITY_TYPE_META, LOGGABLE_ACTIVITY_TYPES, CONTACT_ACTIVITY_TYPES } from "@/lib/activity";
import type { ActivityType } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function QuickLogContactMenu({ leadId }: { leadId: string }) {
  const router = useRouter();
  const profile = useProfile();
  const [pending, setPending] = useState<ActivityType | null>(null);

  async function logActivity(type: ActivityType) {
    setPending(type);
    const supabase = createClient();

    const { error: activityError } = await supabase.from("activities").insert({
      lead_id: leadId,
      type,
      body: `Logged ${ACTIVITY_TYPE_META[type].label.toLowerCase()} from the Follow-ups hub.`,
      created_by: profile?.id ?? null,
    });

    if (activityError) {
      setPending(null);
      toast.error("Failed to log activity", { description: activityError.message });
      return;
    }

    if (CONTACT_ACTIVITY_TYPES.includes(type)) {
      await supabase
        .from("leads")
        .update({ last_contact_at: new Date().toISOString() })
        .eq("id", leadId);
    }

    setPending(null);
    toast.success(`${ACTIVITY_TYPE_META[type].label} logged`);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => e.stopPropagation()}
          disabled={!!pending}
        >
          {pending ? <Loader2 className="animate-spin" /> : <MessageSquarePlus />}
          Log contact
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        {LOGGABLE_ACTIVITY_TYPES.map((type) => (
          <DropdownMenuItem key={type} onClick={() => logActivity(type)}>
            {ACTIVITY_TYPE_META[type].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
