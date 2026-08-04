import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ACTIVITY_TYPE_META } from "@/lib/activity";
import { formatBudgetRange, formatDate, formatDateTime, fullName } from "@/lib/format";
import {
  drawBrandFooter,
  drawBrandHeader,
  drawWatermarkOnAllPages,
  loadIvyBrandAssets,
  IVY_BRAND,
  IVY_TABLE_HEAD_STYLES,
} from "@/lib/pdf-branding";
import type { LeadWithRelations } from "@/lib/queries/leads";
import type { ActivityWithAuthor } from "@/lib/queries/activities";

const MARGIN = 14;
const PAGE_WIDTH = 210;
const RECENT_ACTIVITIES_PER_LEAD = 5;

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

/**
 * A working document bundling several leads' full details plus a recent
 * communication summary — for handing a sales manager (or reviewing several
 * clients at once). Not a proof-of-ownership document: it skips evidence
 * screenshots, which belong to the per-lead Client Ownership Report instead.
 */
export async function generateBulkLeadsReport({
  reportTitle,
  leads,
  activitiesByLeadId,
  generatedByName,
}: {
  reportTitle: string;
  leads: LeadWithRelations[];
  activitiesByLeadId: Map<string, ActivityWithAuthor[]>;
  generatedByName: string | null;
}) {
  const { logo, icon } = await loadIvyBrandAssets();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawBrandHeader(
    doc,
    logo,
    reportTitle,
    `${leads.length} lead${leads.length === 1 ? "" : "s"} — Generated ${formatDateTime(new Date().toISOString())}${
      generatedByName ? ` by ${generatedByName}` : ""
    }`,
    PAGE_WIDTH,
    MARGIN
  );

  for (const [index, lead] of leads.entries()) {
    y = ensureSpace(doc, y, 20);
    if (index > 0) {
      doc.setDrawColor(220);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, y - 4, PAGE_WIDTH - MARGIN, y - 4);
      y += 2;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...IVY_BRAND.ink);
    doc.text(fullName(lead), MARGIN, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Field", "Detail"]],
      body: [
        ["Phone", lead.phone ?? "—"],
        ["Email", lead.email ?? "—"],
        ["Status", lead.status],
        ["Priority", lead.priority],
        ["Sales manager", lead.assigned_agent?.name ?? "Unassigned"],
        ["Project", lead.property_type?.name ?? "—"],
        ["Location", lead.preferred_area ?? "—"],
        ["Budget", formatBudgetRange(lead.budget_min, lead.budget_max)],
        ["Date of inquiry", formatDate(lead.created_at)],
        ["Last contact", formatDate(lead.last_contact_at)],
        ["Next follow-up", formatDate(lead.next_follow_up_at)],
      ],
      styles: { fontSize: 8.5 },
      headStyles: IVY_TABLE_HEAD_STYLES,
      margin: { left: MARGIN, right: MARGIN },
    });
    y = lastAutoTableY(doc) + 4;

    const activities = (activitiesByLeadId.get(lead.id) ?? [])
      .filter((a) => a.type !== "status_change")
      .slice(0, RECENT_ACTIVITIES_PER_LEAD);

    y = ensureSpace(doc, y, 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...IVY_BRAND.ink);
    doc.text("Recent communication", MARGIN, y);
    y += 5;

    if (activities.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...IVY_BRAND.muted);
      doc.text("No notes or contact logged yet.", MARGIN, y);
      y += 8;
    } else {
      autoTable(doc, {
        startY: y,
        head: [["Date", "Type", "Note"]],
        body: activities.map((a) => [
          formatDateTime(a.created_at),
          ACTIVITY_TYPE_META[a.type].label,
          a.body ?? "—",
        ]),
        styles: { fontSize: 8 },
        headStyles: IVY_TABLE_HEAD_STYLES,
        columnStyles: { 2: { cellWidth: 90 } },
        margin: { left: MARGIN, right: MARGIN },
      });
      y = lastAutoTableY(doc) + 8;
    }
  }

  drawWatermarkOnAllPages(doc, icon);
  drawBrandFooter(doc, MARGIN, "Ivy Group CRM — Confidential — Multi-lead report");

  doc.save(`${reportTitle.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
