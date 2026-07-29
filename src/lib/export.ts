import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  drawBrandHeader,
  drawWatermarkOnAllPages,
  loadIvyBrandAssets,
  IVY_BRAND,
} from "@/lib/pdf-branding";

export type ExportColumn<T> = {
  key: keyof T;
  label: string;
};

function toRows<T>(data: T[], columns: ExportColumn<T>[]) {
  return data.map((row) =>
    Object.fromEntries(columns.map((col) => [col.label, row[col.key] ?? ""]))
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToCSV<T>(data: T[], columns: ExportColumn<T>[], filename: string) {
  const csv = Papa.unparse(toRows(data, columns));
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

export function exportToExcel<T>(data: T[], columns: ExportColumn<T>[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(toRows(data, columns));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

export async function exportToPDF<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  title: string
) {
  const { logo, icon } = await loadIvyBrandAssets();
  const margin = 14;
  const doc = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait" });
  const pageWidth = doc.internal.pageSize.getWidth();

  const startY = drawBrandHeader(
    doc,
    logo,
    title,
    new Date().toLocaleString(),
    pageWidth,
    margin
  );

  autoTable(doc, {
    startY,
    head: [columns.map((c) => c.label)],
    body: data.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: IVY_BRAND.ivy800 },
    margin: { left: margin, right: margin },
  });

  drawWatermarkOnAllPages(doc, icon);

  doc.save(`${filename}.pdf`);
}
