import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_WORKSPACE, initialsFor, isAccentKey, type Workspace } from "@/lib/workspace";

/**
 * The workspace's branding. Read with the service role because the sign-in
 * page needs it before anyone is signed in; it only ever returns display
 * fields (name, initials, tagline, logo, accent), never anything private.
 *
 * Until Orion hosts more than one company there's exactly one row (Ivy
 * Group). If the branding migration hasn't been run yet, or the read
 * fails for any reason, this falls back to Ivy Group's defaults so sign-in
 * and the app keep working exactly as before.
 */
export const getWorkspace = cache(async (): Promise<Workspace> => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, short_name, tagline, logo_url, accent")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error || !data) return DEFAULT_WORKSPACE;
    return {
      id: data.id,
      name: data.name,
      shortName: data.short_name?.trim() || initialsFor(data.name),
      tagline: data.tagline,
      logoUrl: data.logo_url,
      accent: isAccentKey(data.accent) ? data.accent : "evergreen",
    };
  } catch {
    return DEFAULT_WORKSPACE;
  }
});
