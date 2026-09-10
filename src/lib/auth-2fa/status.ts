import "server-only";
import { createClient } from "@/lib/supabase/server";

export type TwoFaDevice = {
  credential_id: string;
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
};

/** The current user's own 2FA setup. */
export async function getMy2faStatus(): Promise<{
  enrolled: boolean;
  pinSet: boolean;
  devices: TwoFaDevice[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { enrolled: false, pinSet: false, devices: [] };

  const [{ data: pin }, { data: devices }] = await Promise.all([
    supabase.from("auth_2fa_pin").select("pin_set_at").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("auth_2fa_webauthn")
      .select("credential_id, device_label, created_at, last_used_at")
      .eq("user_id", user.id)
      .order("created_at"),
  ]);

  const list = (devices ?? []) as TwoFaDevice[];
  return { enrolled: !!pin?.pin_set_at || list.length > 0, pinSet: !!pin?.pin_set_at, devices: list };
}

export type TeamMember2faStatus = {
  user_id: string;
  label: string;
  email: string | null;
  deviceCount: number;
  pinSet: boolean;
  enrolled: boolean;
};

/** Admin view: enrolment state for everyone (for Settings). */
export async function getTeam2faStatus(): Promise<TeamMember2faStatus[]> {
  const supabase = await createClient();
  const [{ data: profiles }, { data: devices }, { data: pins }] = await Promise.all([
    supabase.from("profiles").select("id, display_name, full_name, email").order("full_name"),
    supabase.from("auth_2fa_webauthn").select("user_id"),
    supabase.from("auth_2fa_pin").select("user_id"),
  ]);

  const deviceCounts = new Map<string, number>();
  for (const d of devices ?? []) deviceCounts.set(d.user_id, (deviceCounts.get(d.user_id) ?? 0) + 1);
  const pinSet = new Set((pins ?? []).map((p) => p.user_id));

  return (profiles ?? []).map((p) => {
    const dc = deviceCounts.get(p.id) ?? 0;
    return {
      user_id: p.id,
      label: p.display_name || p.full_name || p.email || "Unknown",
      email: p.email,
      deviceCount: dc,
      pinSet: pinSet.has(p.id),
      enrolled: dc > 0 || pinSet.has(p.id),
    };
  });
}
