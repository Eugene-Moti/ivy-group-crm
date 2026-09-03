import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  drawBrandFooter,
  drawBrandHeader,
  drawWatermarkOnAllPages,
  loadIvyBrandAssets,
  IVY_TABLE_HEAD_STYLES,
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

const EXCEL_COL_MIN_WIDTH = 10;
const EXCEL_COL_MAX_WIDTH = 40;

export function exportToExcel<T>(data: T[], columns: ExportColumn<T>[], filename: string) {
  const rows = toRows(data, columns);
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths from the actual content — a flat, default-width
  // sheet is the one thing that makes an otherwise-branded set of reports
  // still look like a raw data dump the moment someone opens it in Excel.
  worksheet["!cols"] = columns.map((col) => {
    const headerWidth = col.label.length;
    const contentWidth = rows.reduce((max, row) => {
      const cell = row[col.label];
      return Math.max(max, cell == null ? 0 : String(cell).length);
    }, 0);
    return { wch: Math.min(EXCEL_COL_MAX_WIDTH, Math.max(EXCEL_COL_MIN_WIDTH, headerWidth, contentWidth) + 2) };
  });

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
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: margin, right: margin },
  });

  drawWatermarkOnAllPages(doc, icon);
  drawBrandFooter(doc, margin);

  doc.save(`${filename}.pdf`);
}
