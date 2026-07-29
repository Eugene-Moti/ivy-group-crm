"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useProfile } from "@/components/providers/profile-provider";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import { generateClientOwnershipReport } from "@/lib/client-report";
import { Button } from "@/components/ui/button";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { ActivityWithAuthor } from "@/lib/queries/activities";
import type { LeadEvidenceWithAuthor } from "@/lib/queries/evidence";

export function GenerateOwnershipReportButton({
  lead,
  activities,
  evidence,
}: {
  lead: LeadWithRelations;
  activities: ActivityWithAuthor[];
  evidence: LeadEvidenceWithAuthor[];
}) {
  const profile = useProfile();
  const statusLabels = useStatusLabels();
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleClick() {
    setIsGenerating(true);
    try {
      await generateClientOwnershipReport({
        lead,
        activities,
        evidence,
        statusLabel: statusLabels[lead.status],
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
      <span className="hidden sm:inline">Ownership report</span>
      <span className="sm:hidden">Report</span>
    </Button>
  );
}
