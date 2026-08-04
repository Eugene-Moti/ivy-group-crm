import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatBudgetRange, formatDateTime, fullName } from "@/lib/format";
import {
  drawBrandFooter,
  drawBrandHeader,
  drawWatermarkOnAllPages,
  loadIvyBrandAssets,
  IVY_BRAND,
  IVY_TABLE_HEAD_STYLES,
} from "@/lib/pdf-branding";
import type { LeadWithRelations } from "@/lib/queries/leads";

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

function leadRow(lead: LeadWithRelations): string[] {
  return [
    fullName(lead),
    lead.phone ?? "—",
    lead.property_type?.name ?? "—",
    lead.status,
    formatDateTime(lead.next_follow_up_at),
    formatBudgetRange(lead.budget_min, lead.budget_max),
  ];
}

const COLUMNS = ["Name", "Phone", "Project", "Status", "Follow-up due", "Budget"];

/** A branded PDF of one sales manager's (or the whole team's) due/overdue follow-ups. */
export async function generateFollowUpReport({
  reportTitle,
  overdue,
  dueToday,
  upcoming,
  generatedByName,
}: {
  reportTitle: string;
  overdue: LeadWithRelations[];
  dueToday: LeadWithRelations[];
  upcoming: LeadWithRelations[];
  generatedByName: string | null;
}) {
  const { logo, icon } = await loadIvyBrandAssets();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawBrandHeader(
    doc,
    logo,
    reportTitle,
    `Generated ${formatDateTime(new Date().toISOString())}${
      generatedByName ? ` by ${generatedByName}` : ""
    }`,
    PAGE_WIDTH,
    MARGIN
  );

  const sections: { title: string; rows: LeadWithRelations[]; color: [number, number, number] }[] = [
    { title: `Overdue (${overdue.length})`, rows: overdue, color: [212, 68, 55] },
    { title: `Due today (${dueToday.length})`, rows: dueToday, color: [201, 140, 34] },
    { title: `Upcoming — next 7 days (${upcoming.length})`, rows: upcoming, color: IVY_BRAND.ivy800 },
  ];

  for (const section of sections) {
    y = ensureSpace(doc, y, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...section.color);
    doc.text(section.title, MARGIN, y);
    y += 5;

    if (section.rows.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...IVY_BRAND.muted);
      doc.text("None.", MARGIN, y);
      y += 10;
      continue;
    }

    autoTable(doc, {
      startY: y,
      head: [COLUMNS],
      body: section.rows.map(leadRow),
      styles: { fontSize: 8.5 },
      headStyles: IVY_TABLE_HEAD_STYLES,
      margin: { left: MARGIN, right: MARGIN },
    });
    y = lastAutoTableY(doc) + 10;
  }

  drawWatermarkOnAllPages(doc, icon);
  drawBrandFooter(doc, MARGIN, "Ivy Group CRM — Confidential — Follow-up schedule");

  doc.save(`${reportTitle.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
