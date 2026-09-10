import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TwoFaSession = {
  userId: string;
  sessionId: string;
  email: string | null;
  isAdmin: boolean;
};

/**
 * Every /api/2fa route needs a live Supabase session but must work BEFORE
 * the second factor is cleared (that's the whole point) — so this checks
 * the session only, and hands back the session id the verification cookie
 * is bound to.
 */
export async function require2faSession(): Promise<TwoFaSession | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims?.sub;
  const sessionId = claims?.claims?.session_id;
  if (!sub || typeof sessionId !== "string") return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, role")
    .eq("id", sub)
    .maybeSingle();

  return {
    userId: sub,
    sessionId,
    email: profile?.email ?? null,
    isAdmin: profile?.role === "admin",
  };
}
