import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateTime } from "@/lib/format";
import {
  drawBrandFooter,
  drawBrandHeader,
  drawWatermarkOnAllPages,
  loadIvyBrandAssets,
  IVY_BRAND,
  IVY_TABLE_HEAD_STYLES,
} from "@/lib/pdf-branding";
import type { MarketingLeadRow, MarketingReport } from "@/lib/marketing-report";

const MARGIN = 14;
const PAGE_WIDTH = 210;
const ROW_COLUMNS = ["Name", "Type", "Project", "Location", "Source", "Stage", "Sales manager"];

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

function rowToCells(row: MarketingLeadRow): string[] {
  return [row.name, row.leadType, row.project, row.location, row.source, row.statusLabel, row.managerName];
}

function section(doc: jsPDF, title: string, rows: MarketingLeadRow[], y: number): number {
  y = ensureSpace(doc, y, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...IVY_BRAND.ink);
  doc.text(title, MARGIN, y);
  y += 5;

  if (rows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...IVY_BRAND.muted);
    doc.text("None right now.", MARGIN, y);
    return y + 10;
  }

  autoTable(doc, {
    startY: y,
    head: [ROW_COLUMNS],
    body: rows.map(rowToCells),
    styles: { fontSize: 8 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });
  return lastAutoTableY(doc) + 10;
}

/**
 * A share-out for the marketing team — pipeline momentum and source
 * performance only. Deliberately excludes phone, email, and budget, even
 * though the admin generating it can see all of that elsewhere.
 */
export async function generateMarketingReport({
  report,
  generatedByName,
}: {
  report: MarketingReport;
  generatedByName: string | null;
}) {
  const { logo, icon } = await loadIvyBrandAssets();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawBrandHeader(
    doc,
    logo,
    "Marketing Team Report",
    `Generated ${formatDateTime(new Date().toISOString())}${
      generatedByName ? ` by ${generatedByName}` : ""
    }`,
    PAGE_WIDTH,
    MARGIN
  );

  const kpis: [string, string][] = [
    ["Negotiating", String(report.negotiatingCount)],
    ["At offer stage", String(report.offerStageCount)],
    ["Site visits booked", String(report.siteVisitCount)],
    ["Best-converting source", report.topSource ? report.topSource.source : "—"],
  ];
  const colWidth = (PAGE_WIDTH - MARGIN * 2) / kpis.length;
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
  y += 18;

  y = section(doc, "Negotiating", report.negotiating, y);
  y = section(doc, "At offer stage", report.offerStage, y);
  y = section(doc, "Site visits / meetings booked", report.siteVisits, y);

  y = ensureSpace(doc, y, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...IVY_BRAND.ink);
  doc.text("Source performance", MARGIN, y);
  y += 5;
  autoTable(doc, {
    startY: y,
    head: [["Source", "Total leads", "Closed won", "Win rate"]],
    body: report.sourcePerformance.map((s) => [
      s.source,
      String(s.total),
      String(s.won),
      `${s.winRate.toFixed(1)}%`,
    ]),
    styles: { fontSize: 8.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastAutoTableY(doc) + 10;

  y = ensureSpace(doc, y, 16);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...IVY_BRAND.ink);
  doc.text("Leads assigned per sales manager", MARGIN, y);
  y += 5;
  autoTable(doc, {
    startY: y,
    head: [["Sales manager", "Direct clients", "Agents", "Total"]],
    body: report.managerBreakdown.map((m) => [
      m.managerName,
      String(m.directClientCount),
      String(m.agentCount),
      String(m.total),
    ]),
    styles: { fontSize: 8.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });

  drawWatermarkOnAllPages(doc, icon);
  drawBrandFooter(doc, MARGIN, "Ivy Group CRM — Marketing Team Report");

  doc.save(`ivy-group-marketing-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
