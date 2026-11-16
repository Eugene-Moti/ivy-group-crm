"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { ACCENTS, initialsFor, type AccentKey, type Workspace } from "@/lib/workspace";
import { OrionMark } from "@/components/brand/orion-mark";
import { WorkspaceBadge } from "@/components/brand/workspace-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

/**
 * Workspace branding: the company's name, initials, tagline, logo and
 * accent colour. Shown in the sidebar, on the sign-in card, and on the
 * buttons and highlights across the app. Changing it never touches leads
 * or any other data.
 */
export function WorkspacePanel({ workspace }: { workspace: Workspace }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(workspace.name);
  const [shortName, setShortName] = useState(workspace.shortName);
  const [tagline, setTagline] = useState(workspace.tagline ?? "");
  const [logoUrl, setLogoUrl] = useState(workspace.logoUrl);
  const [accent, setAccent] = useState<AccentKey>(workspace.accent);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const notSetUp = !workspace.id;
  const preview: Workspace = {
    ...workspace,
    name: name.trim() || workspace.name,
    shortName: (shortName.trim() || initialsFor(name || workspace.name)).slice(0, 3).toUpperCase(),
    logoUrl,
    accent,
  };
  const dirty =
    name.trim() !== workspace.name ||
    preview.shortName !== workspace.shortName ||
    (tagline.trim() || null) !== workspace.tagline ||
    logoUrl !== workspace.logoUrl ||
    accent !== workspace.accent;

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !workspace.id) return;
    if (!file.type.startsWith("image/")) return void toast.error("Please choose an image file.");
    if (file.size > MAX_LOGO_BYTES) return void toast.error("Logo is too large", { description: "Max 2MB." });

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop() || "png";
    const path = `${workspace.id}/logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file);
    setUploading(false);
    if (error) return void toast.error("Failed to upload logo", { description: error.message });
    setLogoUrl(supabase.storage.from("branding").getPublicUrl(path).data.publicUrl);
  }

  async function handleSave() {
    if (!workspace.id || !name.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("organizations")
      .update({
        name: name.trim(),
        short_name: preview.shortName,
        tagline: tagline.trim() || null,
        logo_url: logoUrl,
        accent,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workspace.id);
    setSaving(false);
    if (error) return void toast.error("Failed to save workspace", { description: error.message });
    toast.success("Workspace branding saved");
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader>
          <CardTitle>Workspace branding</CardTitle>
          <CardDescription>
            How your company appears in Orion: the sidebar, the sign-in page, and the colour of buttons and highlights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {notSetUp && (
            <p className="rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">
              Branding isn&apos;t switched on in the database yet. Run the <code>workspace_branding</code> migration in
              Supabase, then reload this page.
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
            <Field>
              <FieldLabel htmlFor="ws-name">Company name</FieldLabel>
              <FieldContent>
                <Input id="ws-name" value={name} onChange={(e) => setName(e.target.value)} disabled={notSetUp} maxLength={60} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="ws-short">Initials</FieldLabel>
              <FieldContent>
                <Input
                  id="ws-short"
                  value={shortName}
                  onChange={(e) => setShortName(e.target.value.toUpperCase().slice(0, 3))}
                  disabled={notSetUp}
                />
              </FieldContent>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="ws-tagline">Tagline (optional)</FieldLabel>
            <FieldContent>
              <Input
                id="ws-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Homes that grow with you"
                disabled={notSetUp}
                maxLength={80}
              />
              <FieldDescription>Shown under your name on the sign-in page.</FieldDescription>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Logo</FieldLabel>
            <FieldContent>
              <div className="flex items-center gap-3">
                <WorkspaceBadge workspace={preview} className="size-12 rounded-xl text-sm" />
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={notSetUp || uploading}>
                  {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                  {logoUrl ? "Replace logo" : "Upload logo"}
                </Button>
                {logoUrl && (
                  <Button type="button" variant="ghost" onClick={() => setLogoUrl(null)} disabled={notSetUp}>
                    <Trash2 />
                    Remove
                  </Button>
                )}
              </div>
              <FieldDescription>A square PNG or SVG works best. Max 2MB. Without a logo, your initials are shown.</FieldDescription>
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>Accent colour</FieldLabel>
            <FieldContent>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Accent colour">
                {(Object.keys(ACCENTS) as AccentKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={accent === key}
                    disabled={notSetUp}
                    onClick={() => setAccent(key)}
                    className={cn(
                      "flex items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1 text-sm transition-[border-color,transform] duration-200 hover:-translate-y-0.5 disabled:opacity-50",
                      accent === key && "border-foreground/40 bg-muted"
                    )}
                  >
                    <span
                      className="flex size-6 items-center justify-center rounded-full text-white"
                      style={{ background: ACCENTS[key].light }}
                    >
                      {accent === key && <Check className="size-3.5" />}
                    </span>
                    {ACCENTS[key].label}
                  </button>
                ))}
              </div>
              <FieldDescription>Used for buttons, links and highlights. Every option keeps text readable in light and dark mode.</FieldDescription>
            </FieldContent>
          </Field>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={notSetUp || !dirty || saving || !name.trim()}>
              {saving && <Loader2 className="animate-spin" />}
              Save branding
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live preview of the sidebar header and a primary button. */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>Updates as you edit.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-2xl bg-ivy-950 p-4 text-mist">
            <div className="flex items-center gap-2.5">
              <OrionMark className="size-8" />
              <span className="font-display text-base tracking-[0.14em]">ORION</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2">
              <WorkspaceBadge workspace={preview} />
              <div className="min-w-0 text-sm leading-tight">
                <p className="truncate font-medium">{preview.name}</p>
                <p className="text-[11px] text-white/50">Workspace</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            tabIndex={-1}
            className="h-9 w-full rounded-lg text-sm font-medium text-white"
            style={{ background: ACCENTS[accent].light }}
          >
            Save lead
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
