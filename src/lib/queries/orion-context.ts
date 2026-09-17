import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type OrionBusinessContextRow = Database["public"]["Tables"]["orion_business_context"]["Row"];

/**
 * Free-text answers admins have given Orion about how this specific team
 * actually works — team-member roles, what each pipeline stage means in
 * practice, follow-up conventions, budget-capture policy, etc. Accepts any
 * already-constructed typed client so both request-scoped routes (this
 * project's server client) and the digest cron (the service-role admin
 * client, which has no request/cookies to build a server client from) can
 * reuse it.
 */
export async function getOrionBusinessContext(
  supabase: SupabaseClient<Database>
): Promise<string> {
  const { data, error } = await supabase
    .from("orion_business_context")
    .select("content")
    .eq("id", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.content?.trim() ?? "";
}

/** Request-scoped convenience wrapper for server components/routes that already have cookies (Settings page, on-demand briefing, chat). */
export async function getOrionBusinessContextForRequest(): Promise<string> {
  const supabase = await createClient();
  return getOrionBusinessContext(supabase);
}
