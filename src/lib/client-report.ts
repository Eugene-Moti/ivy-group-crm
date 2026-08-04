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
import type { LeadEvidenceWithAuthor } from "@/lib/queries/evidence";

const MARGIN = 14;

/** Attributes an entry to the company, not just an individual — this document is meant to stand as an official record. */
function attribution(name: string | null | undefined): string {
  return name ? `Marketing Team — ${name}` : "—";
}
const PAGE_WIDTH = 210;

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

/** jspdf-autotable attaches this to the doc instance at runtime; its types don't declare it. */
function lastAutoTableY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

function jpdfFormatFromMime(mime: string): string {
  if (mime.includes("png")) return "PNG";
  if (mime.includes("webp")) return "WEBP";
  return "JPEG";
}

async function toEmbeddableImage(
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(blob);
    });
    const img = await loadImage(dataUrl);
    return { dataUrl, width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    return null;
  }
}

/** Builds and downloads a PDF compiling everything recorded against a lead — proof of ownership. */
export async function generateClientOwnershipReport({
  lead,
  activities,
  evidence,
  statusLabel,
  generatedByName,
}: {
  lead: LeadWithRelations;
  activities: ActivityWithAuthor[];
  evidence: LeadEvidenceWithAuthor[];
  statusLabel: string;
  generatedByName: string | null;
}) {
  const { logo, icon } = await loadIvyBrandAssets();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const name = fullName(lead);
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  let y = drawBrandHeader(
    doc,
    logo,
    "Client Ownership Record",
    `Generated ${formatDateTime(new Date().toISOString())}${
      generatedByName ? ` by ${generatedByName}` : ""
    }`,
    PAGE_WIDTH,
    MARGIN
  );

  doc.setFontSize(14);
  doc.setTextColor(...IVY_BRAND.ink);
  doc.text(name, MARGIN, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [["Field", "Detail"]],
    body: [
      ["Lead type", lead.lead_type],
      ["Phone", lead.phone ?? "—"],
      ["Email", lead.email ?? "—"],
      ["Status", statusLabel],
      ["Priority", lead.priority],
      ["Source", lead.lead_source?.name ?? "—"],
      ["Project", lead.property_type?.name ?? "—"],
      ["Location", lead.preferred_area ?? "—"],
      ["Budget", formatBudgetRange(lead.budget_min, lead.budget_max)],
      ["Sales manager", lead.assigned_agent?.name ?? "Unassigned"],
      ["Referred by", lead.referred_by ? fullName(lead.referred_by) : "—"],
      ["Date of inquiry", formatDate(lead.created_at)],
      ["Last contact", formatDate(lead.last_contact_at)],
    ],
    styles: { fontSize: 9 },
    headStyles: IVY_TABLE_HEAD_STYLES,
    margin: { left: MARGIN, right: MARGIN },
  });

  y = lastAutoTableY(doc) + 10;

  y = ensureSpace(doc, y, 14);
  doc.setFontSize(12);
  doc.setTextColor(...IVY_BRAND.ink);
  doc.text("Communication history", MARGIN, y);
  y += 2;

  const sortedActivities = activities
    .filter((a) => a.type !== "status_change")
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (sortedActivities.length > 0) {
    autoTable(doc, {
      startY: y + 4,
      head: [["Date", "Type", "Details", "Logged by"]],
      body: sortedActivities.map((a) => [
        formatDateTime(a.created_at),
        ACTIVITY_TYPE_META[a.type].label,
        a.body ?? "—",
        attribution(a.author?.full_name),
      ]),
      styles: { fontSize: 8 },
      headStyles: IVY_TABLE_HEAD_STYLES,
      columnStyles: { 2: { cellWidth: 80 } },
      margin: { left: MARGIN, right: MARGIN },
    });
    y = lastAutoTableY(doc) + 10;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("No communication logged.", MARGIN, y + 6);
    y += 14;
  }

  y = ensureSpace(doc, y, 14);
  doc.setFontSize(12);
  doc.setTextColor(...IVY_BRAND.ink);
  doc.text("Evidence of contact", MARGIN, y);
  y += 8;

  const sortedEvidence = [...evidence].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime()
  );

  if (sortedEvidence.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text("No evidence recorded.", MARGIN, y);
    y += 10;
  }

  for (const item of sortedEvidence) {
    y = ensureSpace(doc, y, 12);
    doc.setFontSize(9);
    doc.setTextColor(20);
    doc.text(formatDate(item.occurred_at), MARGIN, y);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(attribution(item.author?.full_name), PAGE_WIDTH - MARGIN, y, {
      align: "right",
    });
    y += 5;

    if (item.note) {
      doc.setFontSize(9);
      doc.setTextColor(60);
      const lines = doc.splitTextToSize(item.note, contentWidth);
      y = ensureSpace(doc, y, lines.length * 4.5);
      doc.text(lines, MARGIN, y);
      y += lines.length * 4.5 + 2;
    }

    if (item.signedUrl && item.file_type?.startsWith("image/")) {
      const image = await toEmbeddableImage(item.signedUrl);
      if (image) {
        const maxW = Math.min(120, contentWidth);
        const maxH = 90;
        const aspect = image.width / image.height;
        let w = maxW;
        let h = w / aspect;
        if (h > maxH) {
          h = maxH;
          w = h * aspect;
        }
        y = ensureSpace(doc, y, h + 6);
        doc.addImage(image.dataUrl, jpdfFormatFromMime(item.file_type), MARGIN, y, w, h);
        y += h + 6;
      } else {
        doc.setFontSize(8);
        doc.setTextColor(180, 60, 60);
        doc.text("[Attachment could not be loaded]", MARGIN, y);
        y += 6;
      }
    } else if (item.file_name) {
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Attached file: ${item.file_name}`, MARGIN, y);
      y += 6;
    }

    doc.setDrawColor(220);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 6;
  }

  drawWatermarkOnAllPages(doc, icon);
  drawBrandFooter(doc, MARGIN, "Ivy Group CRM — Confidential — Proof of client ownership");

  doc.save(`${name.replace(/\s+/g, "-")}-ownership-report.pdf`);
}
