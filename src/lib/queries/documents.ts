import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type LeadDocumentRow = Database["public"]["Tables"]["lead_documents"]["Row"];

export type LeadDocumentWithAuthor = LeadDocumentRow & {
  author: { id: string; full_name: string | null } | null;
  signedUrl: string | null;
};

const SIGNED_URL_TTL_SECONDS = 3600;

/** Documents (contracts, ID copies, offer letters, ...) for a lead, newest first, with a signed URL per file. */
export async function getLeadDocuments(leadId: string): Promise<LeadDocumentWithAuthor[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lead_documents")
    .select("*, author:profiles!lead_documents_created_by_fkey(id, full_name)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as (LeadDocumentRow & {
    author: { id: string; full_name: string | null } | null;
  })[];

  return Promise.all(
    rows.map(async (row) => {
      const { data: signed } = await supabase.storage
        .from("lead-documents")
        .createSignedUrl(row.file_path, SIGNED_URL_TTL_SECONDS);
      return { ...row, signedUrl: signed?.signedUrl ?? null };
    })
  );
}
