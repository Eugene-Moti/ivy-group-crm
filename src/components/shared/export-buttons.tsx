"use client";

import { FileSpreadsheet, FileText, Sheet } from "lucide-react";
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
  const disabled = data.length === 0;

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
          disabled={disabled}
          onClick={() => exportToPDF(data, columns, filename, title)}
        >
          <Sheet className="size-4" />
          PDF
        </Button>
      )}
    </div>
  );
}
