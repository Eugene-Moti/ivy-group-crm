import { NextResponse } from "next/server";
import { getCurrentProfile, isAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const role = body?.role === "admin" ? "admin" : "viewer";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const { origin } = new URL(request.url);
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: fullName ? { full_name: fullName } : undefined,
    redirectTo: `${origin}/auth/callback`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const newUserId = data.user?.id;
  if (newUserId && role === "admin") {
    const { error: roleError } = await adminClient
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", newUserId);

    if (roleError) {
      return NextResponse.json(
        { error: `Invite sent, but couldn't set the role: ${roleError.message}` },
        { status: 207 }
      );
    }
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const profile = await getCurrentProfile();
  if (!isAdmin(profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const userId = typeof body?.userId === "string" ? body.userId : "";

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (userId === profile!.id) {
    return NextResponse.json(
      { error: "You can't remove your own account." },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
