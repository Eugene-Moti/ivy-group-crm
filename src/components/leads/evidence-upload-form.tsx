"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function todayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EvidenceUploadForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const profile = useProfile();
  const [occurredAt, setOccurredAt] = useState(todayLocal());
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!note.trim() && !file) {
      toast.error("Add a note or attach a file before saving.");
      return;
    }
    if (file && file.size > MAX_FILE_BYTES) {
      toast.error("File is too large", { description: "Max 10MB per file." });
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    let filePath: string | null = null;
    if (file) {
      const path = `${leadId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("lead-evidence")
        .upload(path, file);

      if (uploadError) {
        setIsSubmitting(false);
        toast.error("Failed to upload file", { description: uploadError.message });
        return;
      }
      filePath = path;
    }

    const { error } = await supabase.from("lead_evidence").insert({
      lead_id: leadId,
      occurred_at: new Date(occurredAt).toISOString(),
      note: note.trim() || null,
      file_path: filePath,
      file_name: file?.name ?? null,
      file_type: file?.type ?? null,
      created_by: profile?.id ?? null,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to save evidence", { description: error.message });
      return;
    }

    toast.success("Evidence saved");
    setNote("");
    setFile(null);
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
            Attach screenshot/file (optional)
          </FieldLabel>
          <FieldContent>
            <Input
              id="evidence-file"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </FieldContent>
        </Field>
      </div>
      <Textarea
        placeholder="What happened, and with whom (call, WhatsApp, email)…"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Upload />}
          Save evidence
        </Button>
      </div>
    </form>
  );
}
