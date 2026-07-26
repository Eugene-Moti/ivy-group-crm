import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type SavedQueryRow = Database["public"]["Tables"]["saved_queries"]["Row"];

export async function getSavedQueries(): Promise<SavedQueryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_queries")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
