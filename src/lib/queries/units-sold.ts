import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type UnitSoldRow = Database["public"]["Tables"]["units_sold"]["Row"];

/**
 * Client name, sales manager, and (for an agent-referred sale) the
 * referring agent are all deliberately NOT columns here — they're derived
 * by joining lead_id back to the already-loaded leads array wherever this
 * is consumed, so there's exactly one place that data can go stale: nowhere.
 */
export async function getUnitsSold(): Promise<UnitSoldRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("units_sold")
    .select("*")
    .order("sold_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}
