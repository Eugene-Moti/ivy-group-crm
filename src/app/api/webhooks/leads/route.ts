import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NEW_LEAD_STATUS_KEY } from "@/lib/constants";
import { leadWebhookSchema } from "@/lib/validations/lead-webhook";

/**
 * Inbound lead capture — a website contact form's own backend, or a no-code
 * bridge (Zapier/Make/n8n) sitting in front of Facebook/Instagram Lead Ads,
 * POSTs here instead of someone typing the lead in by hand. There's no user
 * session on an inbound webhook call, so this runs on the service-role
 * admin client, like the digest cron route.
 *
 * NEVER call this directly from client-side JS on a public website — that
 * would expose LEAD_WEBHOOK_SECRET to every visitor. Route it through your
 * site's own server-side form handler, or a tool like Zapier/Make that
 * keeps the secret in its stored credentials, never in the browser.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.LEAD_WEBHOOK_SECRET || authHeader !== `Bearer ${process.env.LEAD_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = leadWebhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid payload" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  try {
    const supabase = createAdminClient();

    // Sources are meant to grow freely (a new ad campaign is a new source)
    // — matched case-insensitively, created if it doesn't exist yet.
    let leadSourceId: string | null = null;
    if (!isBlank(data.source)) {
      const name = data.source!.trim();
      const { data: existing } = await supabase
        .from("lead_sources")
        .select("id")
        .ilike("name", name)
        .maybeSingle();
      if (existing) {
        leadSourceId = existing.id;
      } else {
        const { data: created } = await supabase
          .from("lead_sources")
          .insert({ name })
          .select("id")
          .single();
        leadSourceId = created?.id ?? null;
      }
    }

    // Projects are real inventory, not freely inventable from a webhook
    // payload — matched only, never auto-created. A typo'd project name
    // just leaves this unset rather than polluting Settings > Projects.
    let propertyTypeId: string | null = null;
    if (!isBlank(data.project)) {
      const { data: matched } = await supabase
        .from("property_types")
        .select("id")
        .ilike("name", data.project!.trim())
        .maybeSingle();
      propertyTypeId = matched?.id ?? null;
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .insert({
        first_name: data.first_name,
        last_name: data.last_name?.trim() || "—",
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        lead_source_id: leadSourceId,
        property_type_id: propertyTypeId,
        lead_type: data.lead_type ?? "Direct Client",
        status: NEW_LEAD_STATUS_KEY,
        priority: "Warm",
      })
      .select("id")
      .single();

    if (error || !lead) {
      throw new Error(error?.message ?? "Failed to create lead");
    }

    const captureNote = [
      `Captured automatically via webhook${data.source ? ` (${data.source.trim()})` : ""}.`,
      !isBlank(data.message) ? `Message: "${data.message!.trim()}"` : null,
    ]
      .filter(Boolean)
      .join(" ");

    await supabase.from("activities").insert({
      lead_id: lead.id,
      type: "note",
      body: captureNote,
      created_by: null,
    });

    return NextResponse.json({ ok: true, lead_id: lead.id }, { status: 201 });
  } catch (err) {
    console.error("Lead webhook failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unexpected error" },
      { status: 500 }
    );
  }
}

function isBlank(value: string | undefined): boolean {
  return !value || value.trim() === "";
}
