import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateTime, formatKES } from "@/lib/format";
import {
  drawBrandFooter,
  drawBrandHeader,
  drawWatermarkOnAllPages,
  loadIvyBrandAssets,
  IVY_BRAND,
  IVY_TABLE_HEAD_STYLES,
} from "@/lib/pdf-branding";

const MARGIN = 14;
const PAGE_WIDTH = 210;

function lastAutoTableY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - MARGIN - 8) {
    doc.addPage();
    return MARGIN + 4;
  }
  return y;
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  y = ensureSpace(doc, y, 14);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...IVY_BRAND.ink);
  doc.text(text, MARGIN, y);
  doc.setDrawColor(...IVY_BRAND.gold);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y + 2, MARGIN + 24, y + 2);
  return y + 8;
}

export type RevenueReportRow = {
  lead_id: string;
  clientName: string;
  sale_type: string;
  unit_number: string;
  project: string | null;
  salesManager: string;
  unit_amount: number;
  sold_at: string;
};

/**
 * No bonus anywhere in this one, deliberately — this is the version that
 * goes to the boss, who doesn't handle the marketing team's bonus payouts.
 * Internal tracking (bonus owed/paid) stays in the on-screen table and the
 * separate finance-only export.
 */
export async function generateRevenueReportPdf({
  rows,
  generatedByName,
}: {
  rows: RevenueReportRow[];
  generatedByName: string | null;
}) {
  const { logo, icon } = await loadIvyBrandAssets();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawBrandHeader(
    doc,
    logo,
    "Units Sold — Revenue Report",
    `Generated ${formatDateTime(new Date().toISOString())}${generatedByName ? ` by ${generatedByName}` : ""}`,
    PAGE_WIDTH,
    MARGIN
  );

  const totalUnits = rows.length;
  const totalValue = rows.reduce((s, r) => s + r.unit_amount, 0);
  const uniqueClients = new Set(rows.map((r) => r.lead_id)).size;

  const kpis: [string, string][] = [
    ["Units sold", String(totalUnits)],
    ["Clients", String(uniqueClients)],
    ["Total unit value", formatKES(totalValue)],
  ];
  const colWidth = (PAGE_WIDTH - MARGIN * 2) / 3;
  kpis.forEach(([label, value], i) => {
    const x = MARGIN + i * colWidth;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...IVY_BRAND.muted);
    doc.text(label, x, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...IVY_BRAND.ink);
    doc.text(value, x, y + 6.5);
  });
  y += 20;

  const byManager = new Map<string, { clients: Set<string>; units: number; value: number }>();
  for (const r of rows) {
    const entry = byManager.get(r.salesManager) ?? { clients: new Set(), units: 0, value: 0 };
    entry.clients.add(r.lead_id);
    entry.units += 1;
    entry.value += r.unit_amount;
    byManager.set(r.salesManager, entry);
  }
  const byManagerRows = Array.from(byManager.entries())
    .map(([name, v]) => ({ name, clients: v.clients.size, units: v.units, value: v.value }))
    .sort((a, b) => b.value - a.value);

  y = sectionTitle(doc, "By sales manager", y);
  autoTable(doc, {
    startY: y,
    head: [["Sales manager", "Clients", "Units sold", "Total unit value"]],
    body: byManagerRows.map((m) => [m.name, String(m.clients), String(m.units), formatKES(m.value)]),
    styles: { fontSize: 8.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastAutoTableY(doc) + 10;

  const byProject = new Map<string, { units: number; value: number }>();
  for (const r of rows) {
    const key = r.project ?? "No project set";
    const entry = byProject.get(key) ?? { units: 0, value: 0 };
    entry.units += 1;
    entry.value += r.unit_amount;
    byProject.set(key, entry);
  }
  const byProjectRows = Array.from(byProject.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.value - a.value);

  y = sectionTitle(doc, "By project", y);
  autoTable(doc, {
    startY: y,
    head: [["Project", "Units sold", "Total unit value"]],
    body: byProjectRows.map((p) => [p.name, String(p.units), formatKES(p.value)]),
    styles: { fontSize: 8.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastAutoTableY(doc) + 10;

  y = sectionTitle(doc, "All sales", y);
  autoTable(doc, {
    startY: y,
    head: [["Client", "Type", "Unit", "Project", "Sales manager", "Unit amount", "Date sold"]],
    body: rows.map((r) => [
      r.clientName,
      r.sale_type,
      r.unit_number,
      r.project ?? "—",
      r.salesManager,
      formatKES(r.unit_amount),
      new Date(r.sold_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
    ]),
    styles: { fontSize: 7.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });

  drawWatermarkOnAllPages(doc, icon);
  drawBrandFooter(doc, MARGIN, "Ivy Group CRM — Revenue Report");

  doc.save(`ivy-group-revenue-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
