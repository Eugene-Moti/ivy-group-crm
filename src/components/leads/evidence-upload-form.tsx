"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function dateOnly(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayLocal() {
  return dateOnly(new Date());
}

export function EvidenceUploadForm({
  leadId,
  leadCreatedAt,
}: {
  leadId: string;
  leadCreatedAt: string;
}) {
  const router = useRouter();
  const profile = useProfile();
  const [occurredAt, setOccurredAt] = useState(todayLocal());
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(newFiles: FileList | null) {
    if (!newFiles) return;
    setFiles((prev) => [...prev, ...Array.from(newFiles)]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() && files.length === 0) {
      toast.error("Add a note or attach at least one file before saving.");
      return;
    }
    const oversized = files.find((f) => f.size > MAX_FILE_BYTES);
    if (oversized) {
      toast.error("A file is too large", {
        description: `"${oversized.name}" is over 10MB — max 10MB per file.`,
      });
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    // One evidence row per file (all sharing this same date/note — they're
    // proof of the same conversation), or a single note-only row if nothing
    // was attached. Best-effort: one failed upload shouldn't lose the rest.
    let saved = 0;
    let failed = 0;

    if (files.length === 0) {
      const { error } = await supabase.from("lead_evidence").insert({
        lead_id: leadId,
        occurred_at: new Date(occurredAt).toISOString(),
        note: note.trim() || null,
        file_path: null,
        file_name: null,
        file_type: null,
        created_by: profile?.id ?? null,
      });
      if (error) failed++;
      else saved++;
    } else {
      for (const file of files) {
        const path = `${leadId}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("lead-evidence")
          .upload(path, file);

        if (uploadError) {
          failed++;
          continue;
        }

        const { error } = await supabase.from("lead_evidence").insert({
          lead_id: leadId,
          occurred_at: new Date(occurredAt).toISOString(),
          note: note.trim() || null,
          file_path: path,
          file_name: file.name,
          file_type: file.type || null,
          created_by: profile?.id ?? null,
        });

        if (error) {
          failed++;
          await supabase.storage.from("lead-evidence").remove([path]);
        } else {
          saved++;
        }
      }
    }

    setIsSubmitting(false);

    if (saved === 0) {
      toast.error("Failed to save evidence", {
        description: failed > 0 ? `${failed} file${failed === 1 ? "" : "s"} failed to upload.` : undefined,
      });
      return;
    }

    // This evidence proves contact happened earlier than the lead's recorded
    // inquiry date — since client details are otherwise entered in real time,
    // that date should move back to match the earliest documented proof.
    let backdated = false;
    if (occurredAt < dateOnly(new Date(leadCreatedAt))) {
      const { error: backdateError } = await supabase
        .from("leads")
        .update({ created_at: new Date(occurredAt).toISOString() })
        .eq("id", leadId);
      backdated = !backdateError;
    }

    const summary =
      saved > 1 ? `${saved} pieces of evidence saved` : "Evidence saved";
    if (failed > 0) {
      toast.warning(`${summary}, but ${failed} file${failed === 1 ? "" : "s"} failed`);
    } else {
      toast.success(backdated ? `${summary} — inquiry date moved back to ${occurredAt}` : summary);
    }

    setNote("");
    setFiles([]);
    setOccurredAt(todayLocal());
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-40">
          <FieldLabel htmlFor="evidence-date">Date it happened</FieldLabel>
          <FieldContent>
            <Input
              id="evidence-date"
              type="date"
              value={occurredAt}
              max={todayLocal()}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </FieldContent>
        </Field>
        <Field className="min-w-48 flex-1">
          <FieldLabel htmlFor="evidence-file">
            Attach screenshots/files (optional) — select multiple at once
          </FieldLabel>
          <FieldContent>
            <Input
              ref={fileInputRef}
              id="evidence-file"
              type="file"
              multiple
              accept="image/*,application/pdf"
              onChange={(e) => addFiles(e.target.files)}
            />
          </FieldContent>
        </Field>
      </div>

      {files.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.lastModified}-${i}`}
              className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 py-1 pr-1 pl-2.5 text-xs"
            >
              <span className="max-w-48 truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label={`Remove ${f.name}`}
                className="flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Textarea
        placeholder="What happened, and with whom (call, WhatsApp, email)…"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Upload />}
          {files.length > 1 ? `Save ${files.length} files` : "Save evidence"}
        </Button>
      </div>
    </form>
  );
}
