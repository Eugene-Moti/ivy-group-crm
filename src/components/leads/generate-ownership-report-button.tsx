"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { useStatusLabels } from "@/components/providers/status-labels-provider";
import { generateClientOwnershipReport } from "@/lib/client-report";
import { Button } from "@/components/ui/button";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { ActivityWithAuthor } from "@/lib/queries/activities";
import type { LeadEvidenceWithAuthor } from "@/lib/queries/evidence";

const LEAD_SELECT =
  "*, lead_source:lead_sources(id, name), property_type:property_types(id, name), assigned_agent:sales_agents!leads_assigned_to_fkey(id, name, phone, email), referred_by:leads!referred_by_lead_id(id, first_name, last_name)";

/**
 * Re-fetches everything fresh at generation time instead of trusting the
 * page's current props — the report is meant to prove ownership, so it
 * should never risk showing a stale inquiry date/activity/evidence just
 * because it was generated a moment before a page refresh landed (e.g.
 * right after backdating the inquiry date from a new evidence entry).
 */
async function fetchLatestOwnershipData(leadId: string) {
  const supabase = createClient();

  const [{ data: freshLead, error: leadError }, { data: freshActivities }, { data: freshEvidenceRows }] =
    await Promise.all([
      supabase.from("leads").select(LEAD_SELECT).eq("id", leadId).maybeSingle(),
      supabase
        .from("activities")
        .select("*, author:profiles!activities_created_by_fkey(id, full_name)")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
      supabase
        .from("lead_evidence")
        .select("*, author:profiles!lead_evidence_created_by_fkey(id, full_name)")
        .eq("lead_id", leadId)
        .order("occurred_at", { ascending: false }),
    ]);

  if (leadError || !freshLead) throw new Error(leadError?.message ?? "Lead not found");

  const evidenceRows = (freshEvidenceRows ?? []) as unknown as LeadEvidenceWithAuthor[];
  const evidenceWithUrls = await Promise.all(
    evidenceRows.map(async (row) => {
      if (!row.file_path) return { ...row, signedUrl: null };
      const { data: signed } = await supabase.storage
        .from("lead-evidence")
        .createSignedUrl(row.file_path, 300);
      return { ...row, signedUrl: signed?.signedUrl ?? null };
    })
  );

  return {
    lead: freshLead as unknown as LeadWithRelations,
    activities: (freshActivities ?? []) as unknown as ActivityWithAuthor[],
    evidence: evidenceWithUrls,
  };
}

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
      // Prefer a live re-fetch so the report can't show stale data (e.g. an
      // inquiry date just backdated by evidence added moments ago); if that
      // fetch itself fails, fall back to what the page already has rather
      // than blocking the report entirely.
      const data = await fetchLatestOwnershipData(lead.id).catch(() => ({
        lead,
        activities,
        evidence,
      }));

      await generateClientOwnershipReport({
        lead: data.lead,
        activities: data.activities,
        evidence: data.evidence,
        statusLabel: statusLabels[data.lead.status],
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
