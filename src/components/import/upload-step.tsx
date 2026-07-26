"use client";

import { useCallback, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { parseImportFile, type ParsedSheet } from "@/lib/import/parse-file";
import { cn } from "@/lib/utils";

export function UploadStep({
  onParsed,
}: {
  onParsed: (sheet: ParsedSheet, filename: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      const isValidType = /\.(csv|xlsx|xls)$/i.test(file.name);
      if (!isValidType) {
        toast.error("Unsupported file type", {
          description: "Upload a .csv or .xlsx file.",
        });
        return;
      }

      setIsParsing(true);
      try {
        const sheet = await parseImportFile(file);
        if (!sheet.headers.length) {
          toast.error("Couldn't find any columns in that file.");
          return;
        }
        onParsed(sheet, file.name);
      } catch (err) {
        toast.error("Failed to parse file", {
          description: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setIsParsing(false);
      }
    },
    [onParsed]
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      className={cn(
        "flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/40 p-10 text-center transition-colors",
        isDragging && "border-gold/60 bg-gold/5"
      )}
    >
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        className="sr-only"
        disabled={isParsing}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {isParsing ? (
        <Loader2 className="size-8 animate-spin text-gold" />
      ) : (
        <FileUp className="size-8 text-gold" />
      )}
      <div>
        <p className="font-medium">
          {isParsing ? "Reading your file…" : "Drop your spreadsheet here, or click to browse"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Supports .csv and .xlsx exported from Excel or Google Sheets.
        </p>
      </div>
    </label>
  );
}
