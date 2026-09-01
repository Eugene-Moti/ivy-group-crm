import jsPDF from "jspdf";
import { formatDate, formatKES } from "@/lib/format";
import {
  drawBrandFooter,
  drawBrandHeader,
  drawWatermarkOnAllPages,
  loadIvyBrandAssets,
  IVY_BRAND,
} from "@/lib/pdf-branding";

const MARGIN = 14;
const PAGE_WIDTH = 210;

export type UnitSaleRecord = {
  unitNumber: string;
  unitSize: string | null;
  project: string | null;
  clientName: string;
  saleType: string;
  agentName: string | null;
  salesManager: string | null;
  unitAmount: number;
  bonusAmount: number;
  bonusPaid: boolean;
  soldAt: string;
  notes: string | null;
};

function row(doc: jsPDF, label: string, value: string, x: number, y: number): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...IVY_BRAND.muted);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...IVY_BRAND.ink);
  doc.text(value, x, y + 6);

  return y + 16;
}

/** A single-unit "sale record" — a compact branded one-pager for one row of the Units Sold report, individually downloadable. */
export async function generateUnitSalePdf(record: UnitSaleRecord) {
  const { logo, icon } = await loadIvyBrandAssets();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawBrandHeader(
    doc,
    logo,
    "Unit Sale Record",
    `Unit ${record.unitNumber} — generated ${formatDate(new Date().toISOString())}`,
    PAGE_WIDTH,
    MARGIN
  );
  y += 4;

  const colWidth = (PAGE_WIDTH - MARGIN * 2) / 2;
  const leftX = MARGIN;
  const rightX = MARGIN + colWidth;
  let leftY = y;
  let rightY = y;

  const leftRows: [string, string][] = [
    ["Unit number", record.unitNumber],
    ["Unit size", record.unitSize ?? "—"],
    ["Project", record.project ?? "—"],
    ["Client", record.clientName],
    ["Sale type", record.saleType],
  ];
  if (record.saleType === "Agent Referral") {
    leftRows.push(["Referred by", record.agentName ?? "—"]);
  }

  const rightRows: [string, string][] = [
    ["Sales manager", record.salesManager ?? "Unassigned"],
    ["Unit amount", formatKES(record.unitAmount)],
    ["Bonus", formatKES(record.bonusAmount)],
    ["Bonus paid", record.bonusPaid ? "Yes" : "Not yet"],
    ["Date sold", formatDate(record.soldAt)],
  ];

  for (const [label, value] of leftRows) {
    leftY = row(doc, label, value, leftX, leftY);
  }
  for (const [label, value] of rightRows) {
    rightY = row(doc, label, value, rightX, rightY);
  }
  y = Math.max(leftY, rightY) + 2;

  if (record.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...IVY_BRAND.muted);
    doc.text("NOTES", leftX, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...IVY_BRAND.ink);
    const lines = doc.splitTextToSize(record.notes, PAGE_WIDTH - MARGIN * 2);
    doc.text(lines, leftX, y + 6);
  }

  drawWatermarkOnAllPages(doc, icon);
  drawBrandFooter(doc, MARGIN, "Ivy Group CRM — Confidential — Unit Sale Record");

  doc.save(`ivy-group-unit-sale-${record.unitNumber.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
}
