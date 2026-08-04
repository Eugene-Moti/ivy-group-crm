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
import type { FullAnalysis, FullAnalysisInsight } from "@/lib/full-analysis";

const MARGIN = 14;
const PAGE_WIDTH = 210;

const SEVERITY_COLOR: Record<FullAnalysisInsight["severity"], [number, number, number]> = {
  critical: [212, 68, 55],
  warning: [201, 140, 34],
  positive: [58, 140, 92],
  info: IVY_BRAND.ivy800,
};

const SEVERITY_LABEL: Record<FullAnalysisInsight["severity"], string> = {
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

export async function generateFullAnalysisReport({
  analysis,
  reportTitle,
  generatedByName,
}: {
  analysis: FullAnalysis;
  reportTitle: string;
  generatedByName: string | null;
}) {
  const { logo, icon } = await loadIvyBrandAssets();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawBrandHeader(
    doc,
    logo,
    reportTitle,
    `Generated ${formatDateTime(analysis.generatedAt.toISOString())}${
      generatedByName ? ` by ${generatedByName}` : ""
    }`,
    PAGE_WIDTH,
    MARGIN
  );

  // Overview KPI strip
  const { overview } = analysis;
  const kpis: [string, string][] = [
    ["Total leads", String(overview.totalLeads)],
    ["Open pipeline", String(overview.openLeads)],
    ["Closed — Won", String(overview.wonLeads)],
    ["Closed — Lost", String(overview.lostLeads)],
    ["Conversion rate", `${overview.conversionRate.toFixed(1)}%`],
    ["Overdue follow-ups", String(overview.overdueFollowUps)],
    ["Median open-lead age", `${overview.medianOpenLeadAgeDays.toFixed(0)} days`],
    ["Notes coverage", `${overview.noteCoverage.toFixed(0)}%`],
    ["Won leads with evidence", `${overview.evidenceCoverageOnWon.toFixed(0)}%`],
  ];
  const colWidth = (PAGE_WIDTH - MARGIN * 2) / 3;
  kpis.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = MARGIN + col * colWidth;
    const boxY = y + row * 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...IVY_BRAND.muted);
    doc.text(label, x, boxY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...IVY_BRAND.ink);
    doc.text(value, x, boxY + 6.5);
  });
  y += Math.ceil(kpis.length / 3) * 20 + 4;

  // Insights & suggestions
  y = sectionTitle(doc, "Insights & suggestions", y);
  for (const insight of analysis.insights) {
    const color = SEVERITY_COLOR[insight.severity];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const detailLines = doc.splitTextToSize(insight.detail, PAGE_WIDTH - MARGIN * 2 - 6);
    const blockHeight = 12 + detailLines.length * 4.2;
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

    y += blockHeight + 2;
  }
  y += 4;

  // By status
  y = sectionTitle(doc, "Pipeline by status", y);
  autoTable(doc, {
    startY: y,
    head: [["Status", "Leads", "% of total"]],
    body: analysis.byStatus
      .filter((s) => s.count > 0)
      .map((s) => [s.label, String(s.count), `${s.percentOfTotal.toFixed(1)}%`]),
    styles: { fontSize: 8.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastAutoTableY(doc) + 10;

  // By sales manager
  y = sectionTitle(doc, "By sales manager", y);
  autoTable(doc, {
    startY: y,
    head: [["Sales manager", "Leads", "Won", "Win rate", "Overdue follow-ups"]],
    body: analysis.byManager.map((m) => [
      m.name,
      String(m.total),
      String(m.won),
      `${m.winRate.toFixed(1)}%`,
      String(m.overdue),
    ]),
    styles: { fontSize: 8.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastAutoTableY(doc) + 10;

  // By project
  y = sectionTitle(doc, "By project", y);
  autoTable(doc, {
    startY: y,
    head: [["Project", "Leads", "Won", "Win rate"]],
    body: analysis.byProject.map((p) => [
      p.name,
      String(p.total),
      String(p.won),
      `${p.winRate.toFixed(1)}%`,
    ]),
    styles: { fontSize: 8.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastAutoTableY(doc) + 10;

  // By source
  y = sectionTitle(doc, "By lead source", y);
  autoTable(doc, {
    startY: y,
    head: [["Source", "Leads", "Won", "Win rate"]],
    body: analysis.bySource.map((s) => [
      s.name,
      String(s.total),
      String(s.won),
      `${s.winRate.toFixed(1)}%`,
    ]),
    styles: { fontSize: 8.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });
  y = lastAutoTableY(doc) + 10;

  // Leads over time
  y = sectionTitle(doc, "Leads by month", y);
  autoTable(doc, {
    startY: y,
    head: [["Month", "New leads"]],
    body: analysis.byMonth.map((m) => [m.label, String(m.count)]),
    styles: { fontSize: 8.5 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });

  drawWatermarkOnAllPages(doc, icon);
  drawBrandFooter(doc, MARGIN, "Ivy Group CRM — Confidential — Full Analysis Report");

  doc.save(`ivy-group-full-analysis-${new Date().toISOString().slice(0, 10)}.pdf`);
}
