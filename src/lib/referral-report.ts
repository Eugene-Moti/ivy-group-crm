import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ACTIVITY_TYPE_META } from "@/lib/activity";
import { formatDate, formatDateTime, fullName } from "@/lib/format";
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
const RECENT_ACTIVITIES_PER_LEAD = 3;

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
 * A referring agent's clients and how the assigned sales manager is
 * progressing them — for sharing back with an agent who wants an update on
 * clients they brought in.
 */
export async function generateReferralProgressReport({
  agentName,
  referredLeads,
  activitiesByLeadId,
  generatedByName,
}: {
  agentName: string;
  referredLeads: LeadWithRelations[];
  activitiesByLeadId: Map<string, ActivityWithAuthor[]>;
  generatedByName: string | null;
}) {
  const { logo, icon } = await loadIvyBrandAssets();
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y = drawBrandHeader(
    doc,
    logo,
    `${agentName}'s Referral Progress`,
    `${referredLeads.length} referred client${referredLeads.length === 1 ? "" : "s"} — Generated ${formatDateTime(
      new Date().toISOString()
    )}${generatedByName ? ` by ${generatedByName}` : ""}`,
    PAGE_WIDTH,
    MARGIN
  );

  for (const [index, lead] of referredLeads.entries()) {
    y = ensureSpace(doc, y, 18);
    if (index > 0) {
      doc.setDrawColor(220);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, y - 4, PAGE_WIDTH - MARGIN, y - 4);
      y += 2;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...IVY_BRAND.ink);
    doc.text(fullName(lead), MARGIN, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...IVY_BRAND.muted);
    doc.text(
      `Status: ${lead.status}  ·  Sales manager: ${lead.assigned_agent?.name ?? "Unassigned"}  ·  Referred: ${formatDate(lead.created_at)}`,
      MARGIN,
      y
    );
    y += 6;

    const activities = (activitiesByLeadId.get(lead.id) ?? [])
      .filter((a) => a.type !== "status_change")
      .slice(0, RECENT_ACTIVITIES_PER_LEAD);

    if (activities.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...IVY_BRAND.muted);
      doc.text("No progress notes logged by the sales manager yet.", MARGIN, y);
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
  drawBrandFooter(doc, MARGIN, "Ivy Group CRM — Confidential — Referral progress");

  doc.save(`${agentName.replace(/\s+/g, "-").toLowerCase()}-referral-progress.pdf`);
}
