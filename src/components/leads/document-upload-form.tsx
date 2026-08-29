"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/components/providers/profile-provider";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function DocumentUploadForm({ leadId }: { leadId: string }) {
  const router = useRouter();
  const profile = useProfile();
  const [documentType, setDocumentType] = useState<DocumentType>("Contract");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Attach a file before saving.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File is too large", { description: "Max 10MB per file." });
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();

    const path = `${leadId}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("lead-documents").upload(path, file);

    if (uploadError) {
      setIsSubmitting(false);
      toast.error("Failed to upload file", { description: uploadError.message });
      return;
    }

    const { error } = await supabase.from("lead_documents").insert({
      lead_id: leadId,
      document_type: documentType,
      note: note.trim() || null,
      file_path: path,
      file_name: file.name,
      file_type: file.type || null,
      created_by: profile?.id ?? null,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error("Failed to save document", { description: error.message });
      return;
    }

    toast.success("Document saved");
    setNote("");
    setFile(null);
    setDocumentType("Contract");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-44">
          <FieldLabel>Document type</FieldLabel>
          <FieldContent>
            <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldContent>
        </Field>
        <Field className="min-w-48 flex-1">
          <FieldLabel htmlFor="document-file">File</FieldLabel>
          <FieldContent>
            <Input
              id="document-file"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
            />
          </FieldContent>
        </Field>
      </div>
      <Textarea
        placeholder="Notes about this document (optional)…"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : <Upload />}
          Save document
        </Button>
      </div>
    </form>
  );
}
