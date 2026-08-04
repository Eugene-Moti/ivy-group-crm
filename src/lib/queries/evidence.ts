import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type LeadEvidenceRow = Database["public"]["Tables"]["lead_evidence"]["Row"];

export type LeadEvidenceWithAuthor = LeadEvidenceRow & {
  author: { id: string; full_name: string | null } | null;
  signedUrl: string | null;
};

const SIGNED_URL_TTL_SECONDS = 3600;

/** Dated evidence (notes/screenshots) for a lead, newest first, with a signed URL per file. */
export async function getLeadEvidence(leadId: string): Promise<LeadEvidenceWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_evidence")
    .select("*, author:profiles!lead_evidence_created_by_fkey(id, full_name)")
    .eq("lead_id", leadId)
    .order("occurred_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as (LeadEvidenceRow & {
    author: { id: string; full_name: string | null } | null;
  })[];

  return Promise.all(
    rows.map(async (row) => {
      if (!row.file_path) return { ...row, signedUrl: null };
      const { data: signed } = await supabase.storage
        .from("lead-evidence")
        .createSignedUrl(row.file_path, SIGNED_URL_TTL_SECONDS);
      return { ...row, signedUrl: signed?.signedUrl ?? null };
    })
  );
}

/** Lead id for every evidence entry — lightweight, for report-wide coverage insights rather than per-lead detail. */
export async function getAllEvidenceLeadIds(): Promise<Pick<LeadEvidenceRow, "lead_id">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("lead_evidence").select("lead_id");

  if (error) throw new Error(error.message);
  return data ?? [];
}
