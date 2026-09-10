import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requirePrivateProfile } from "@/lib/private/access";
import { isUnlocked } from "@/lib/private/unlock";
import { logPrivate } from "@/lib/private/audit";
import { isAdmin } from "@/lib/auth";
import { NEW_LEAD_STATUS_KEY } from "@/lib/constants";

/** Create a private client. Server-side so it's audit-logged and forced clean (no sales manager). */
export async function POST(request: Request) {
  const gate = await requirePrivateProfile();
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isAdmin(gate.profile)) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  if (!(await isUnlocked(gate.profile.id))) {
    return NextResponse.json({ error: "Unlock the private area first." }, { status: 403 });
  }

  const b = await request.json().catch(() => null);
  const firstName = typeof b?.first_name === "string" ? b.first_name.trim() : "";
  const lastName = typeof b?.last_name === "string" ? b.last_name.trim() : "";
  if (!firstName) return NextResponse.json({ error: "First name is required." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      first_name: firstName,
      last_name: lastName || "—",
      phone: typeof b?.phone === "string" && b.phone.trim() ? b.phone.trim() : null,
      email: typeof b?.email === "string" && b.email.trim() ? b.email.trim() : null,
      codename: typeof b?.codename === "string" && b.codename.trim() ? b.codename.trim() : null,
      confidential_brief:
        typeof b?.confidential_brief === "string" && b.confidential_brief.trim()
          ? b.confidential_brief.trim()
          : null,
      property_type_id: typeof b?.property_type_id === "string" ? b.property_type_id : null,
      priority: b?.priority === "Hot" || b?.priority === "Cold" ? b.priority : "Warm",
      status: NEW_LEAD_STATUS_KEY,
      lead_type: "Direct Client",
      is_private: true,
      assigned_to: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Failed to create" }, { status: 400 });
  }

  await logPrivate("create_client", { leadId: data.id });
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 });
}

/** Move an existing lead into or out of the private area. */
export async function PATCH(request: Request) {
  const gate = await requirePrivateProfile();
  if (!gate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isAdmin(gate.profile)) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  if (!(await isUnlocked(gate.profile.id))) {
    return NextResponse.json({ error: "Unlock the private area first." }, { status: 403 });
  }

  const b = await request.json().catch(() => null);
  const leadId = typeof b?.leadId === "string" ? b.leadId : "";
  const makePrivate = b?.isPrivate === true;
  if (!leadId) return NextResponse.json({ error: "Missing leadId" }, { status: 400 });

  const supabase = await createClient();
  const update: { is_private: boolean; assigned_to?: null } = { is_private: makePrivate };
  // Going private also drops any sales-manager assignment — the whole point.
  if (makePrivate) update.assigned_to = null;

  const { error } = await supabase.from("leads").update(update).eq("id", leadId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await logPrivate(makePrivate ? "move_in" : "move_out", { leadId });
  return NextResponse.json({ ok: true });
}
