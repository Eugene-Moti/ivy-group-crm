"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText, Loader2, Sheet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportToCSV, exportToExcel, exportToPDF, type ExportColumn } from "@/lib/export";

type ExportFormat = "csv" | "excel" | "pdf";

export function ExportButtons<T>({
  data,
  columns,
  filename,
  title,
  formats = ["csv", "excel", "pdf"],
}: {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  title: string;
  formats?: ExportFormat[];
}) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const disabled = data.length === 0;

  async function handlePDF() {
    setIsGeneratingPdf(true);
    try {
      await exportToPDF(data, columns, filename, title);
    } catch (err) {
      toast.error("Failed to generate PDF", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {formats.includes("csv") && (
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => exportToCSV(data, columns, filename)}
        >
          <FileText className="size-4" />
          CSV
        </Button>
      )}
      {formats.includes("excel") && (
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => exportToExcel(data, columns, filename)}
        >
          <FileSpreadsheet className="size-4" />
          Excel
        </Button>
      )}
      {formats.includes("pdf") && (
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isGeneratingPdf}
          onClick={handlePDF}
        >
          {isGeneratingPdf ? <Loader2 className="animate-spin" /> : <Sheet className="size-4" />}
          PDF
        </Button>
      )}
    </div>
  );
}
