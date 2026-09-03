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
import type { PeriodInsight, PeriodReportResult } from "@/lib/period-report";

const MARGIN = 14;
const PAGE_WIDTH = 210;

const SEVERITY_COLOR: Record<PeriodInsight["severity"], [number, number, number]> = {
  critical: [212, 68, 55],
  warning: [201, 140, 34],
  positive: [58, 140, 92],
  info: IVY_BRAND.ivy800,
};

const SEVERITY_LABEL: Record<PeriodInsight["severity"], string> = {
  critical: "Needs attention",
  warning: "Worth reviewing",
  positive: "Going well",
  info: "For your information",
};

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

export async function generatePeriodReportPdf({
  report,
  generatedByName,
}: {
  report: PeriodReportResult;
  generatedByName: string | null;
}) {
  const { logo, icon } = await loadIvyBrandAssets();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { current, previous } = report;

  let y = drawBrandHeader(
    doc,
    logo,
    `${report.type === "week" ? "Weekly" : "Monthly"} Review — ${report.period.label}`,
    `Generated ${formatDateTime(new Date().toISOString())}${
      generatedByName ? ` by ${generatedByName}` : ""
    } — compared against ${report.previousPeriod.label}`,
    PAGE_WIDTH,
    MARGIN
  );

  const kpis: [string, string][] = [
    ["New leads", `${current.newLeads} (was ${previous.newLeads})`],
    ["Won", `${current.won} (was ${previous.won})`],
    ["Lost", `${current.lost} (was ${previous.lost})`],
    ["Conversion rate", `${current.conversionRate.toFixed(1)}% (was ${previous.conversionRate.toFixed(1)}%)`],
    ["Units sold", `${current.unitsSoldCount} (was ${previous.unitsSoldCount})`],
    ["Bonus earned", `${formatKES(current.bonusEarned)} (was ${formatKES(previous.bonusEarned)})`],
  ];
  const colWidth = (PAGE_WIDTH - MARGIN * 2) / 2;
  kpis.forEach(([label, value], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * colWidth;
    const boxY = y + row * 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...IVY_BRAND.muted);
    doc.text(label, x, boxY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...IVY_BRAND.ink);
    doc.text(value, x, boxY + 6.5);
  });
  y += Math.ceil(kpis.length / 2) * 20 + 4;

  y = sectionTitle(doc, "Insights & suggestions", y);
  for (const insight of report.insights) {
    const color = SEVERITY_COLOR[insight.severity];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const detailLines = doc.splitTextToSize(insight.detail, PAGE_WIDTH - MARGIN * 2 - 6);
    const leadsLine =
      insight.leads && insight.leads.length > 0
        ? doc.splitTextToSize(
            `Leads: ${insight.leads.map((l) => l.name).join(", ")}`,
            PAGE_WIDTH - MARGIN * 2 - 6
          )
        : [];
    const blockHeight = 12 + detailLines.length * 4.2 + leadsLine.length * 4.2;
    y = ensureSpace(doc, y, blockHeight);

    doc.setFillColor(...color);
    doc.rect(MARGIN, y - 4, 1.4, blockHeight - 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...IVY_BRAND.ink);
    doc.text(insight.title, MARGIN + 4, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...color);
    doc.text(SEVERITY_LABEL[insight.severity].toUpperCase(), PAGE_WIDTH - MARGIN, y, {
      align: "right",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...IVY_BRAND.muted);
    doc.text(detailLines, MARGIN + 4, y + 5);

    if (leadsLine.length > 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...IVY_BRAND.muted);
      doc.text(leadsLine, MARGIN + 4, y + 5 + detailLines.length * 4.2);
    }

    y += blockHeight + 2;
  }
  y += 4;

  y = sectionTitle(doc, "By sales manager (closed this period)", y);
  autoTable(doc, {
    startY: y,
    head: [["Sales manager", "Closed", "Won", "Win rate"]],
    body: current.byManager.map((m) => [m.name, String(m.total), String(m.won), `${m.winRate.toFixed(1)}%`]),
    styles: { fontSize: 8.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastAutoTableY(doc) + 10;

  y = sectionTitle(doc, "By source (closed this period)", y);
  autoTable(doc, {
    startY: y,
    head: [["Source", "Closed", "Won", "Win rate"]],
    body: current.bySource.map((s) => [s.name, String(s.total), String(s.won), `${s.winRate.toFixed(1)}%`]),
    styles: { fontSize: 8.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastAutoTableY(doc) + 10;

  y = sectionTitle(doc, "By project (closed this period)", y);
  autoTable(doc, {
    startY: y,
    head: [["Project", "Closed", "Won", "Win rate"]],
    body: current.byProject.map((p) => [p.name, String(p.total), String(p.won), `${p.winRate.toFixed(1)}%`]),
    styles: { fontSize: 8.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastAutoTableY(doc) + 10;

  y = sectionTitle(doc, "Why deals were lost this period", y);
  autoTable(doc, {
    startY: y,
    head: [["Reason", "Count"]],
    body: current.lostByReason.length
      ? current.lostByReason.map((r) => [r.reason, String(r.count)])
      : [["No deals lost this period", ""]],
    styles: { fontSize: 8.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });

  drawWatermarkOnAllPages(doc, icon);
  drawBrandFooter(doc, MARGIN, "Ivy Group CRM — Confidential — Period Review");

  const filenamePeriod = report.period.key.slice(0, 10);
  doc.save(`ivy-group-period-review-${report.type}-${filenamePeriod}.pdf`);
}
