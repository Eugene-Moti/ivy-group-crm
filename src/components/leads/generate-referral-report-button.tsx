"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { fullName } from "@/lib/format";
import { generateReferralProgressReport } from "@/lib/referral-report";
import { Button } from "@/components/ui/button";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { ActivityWithAuthor } from "@/lib/queries/activities";

export function GenerateReferralReportButton({
  agentLead,
  referredLeads,
}: {
  agentLead: LeadWithRelations;
  referredLeads: LeadWithRelations[];
}) {
  const profile = useProfile();
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleClick() {
    setIsGenerating(true);
    try {
      const supabase = createClient();
      const ids = referredLeads.map((l) => l.id);
      const { data, error } = await supabase
        .from("activities")
        .select("*, author:profiles!activities_created_by_fkey(id, full_name)")
        .in("lead_id", ids)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      const activitiesByLeadId = new Map<string, ActivityWithAuthor[]>();
      for (const activity of (data ?? []) as unknown as ActivityWithAuthor[]) {
        const arr = activitiesByLeadId.get(activity.lead_id) ?? [];
        arr.push(activity);
        activitiesByLeadId.set(activity.lead_id, arr);
      }

      await generateReferralProgressReport({
        agentName: fullName(agentLead),
        referredLeads,
        activitiesByLeadId,
        generatedByName: profile?.full_name ?? null,
      });
    } catch (err) {
      toast.error("Failed to generate report", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={isGenerating}>
      {isGenerating ? <Loader2 className="animate-spin" /> : <FileDown className="size-4" />}
      Referral report
    </Button>
  );
}
