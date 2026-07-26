import Papa from "papaparse";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

export function exportToPDF<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  title: string
) {
  const doc = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait" });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(new Date().toLocaleString(), 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [columns.map((c) => c.label)],
    body: data.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [22, 56, 42] },
  });

  doc.save(`${filename}.pdf`);
}
