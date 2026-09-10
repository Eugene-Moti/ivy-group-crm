import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, type Profile } from "@/lib/auth";

export type PrivateAccess = {
  hasAccess: boolean;
  isOwner: boolean;
};

/**
 * Whether the signed-in user is on the private-clients allowlist, and
 * whether they're the owner (the only role that can change the allowlist).
 * Read through the RLS-scoped client — a user can always see their own
 * private_lead_access row.
 */
export async function getPrivateAccess(): Promise<PrivateAccess> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { hasAccess: false, isOwner: false };

  const { data } = await supabase
    .from("private_lead_access")
    .select("is_owner")
    .eq("user_id", user.id)
    .maybeSingle();

  return { hasAccess: !!data, isOwner: !!data?.is_owner };
}

/** The full allowlist with profile details — visible to any allowlisted user. */
export async function getPrivateAllowlist() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("private_lead_access")
    .select("user_id, is_owner, granted_at, profile:profiles!private_lead_access_user_id_fkey(display_name, full_name, email)")
    .order("granted_at");

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Array<{
    user_id: string;
    is_owner: boolean;
    granted_at: string;
    profile: { display_name: string | null; full_name: string | null; email: string | null } | null;
  }>;
}

/** Server-guard: current profile, only if they hold private access. */
export async function requirePrivateProfile(): Promise<{ profile: Profile; access: PrivateAccess } | null> {
  const [profile, access] = await Promise.all([getCurrentProfile(), getPrivateAccess()]);
  if (!profile || !access.hasAccess) return null;
  return { profile, access };
}
