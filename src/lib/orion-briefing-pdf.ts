import jsPDF from "jspdf";
import { formatDateTime } from "@/lib/format";
import {
  drawBrandFooter,
  drawBrandHeader,
  drawWatermarkOnAllPages,
  loadIvyBrandAssets,
  IVY_BRAND,
} from "@/lib/pdf-branding";
import type { OrionBriefing, OrionBriefingItem } from "@/app/api/orion/briefing/route";

const MARGIN = 14;
const PAGE_WIDTH = 210;

const SEVERITY_COLOR: Record<OrionBriefingItem["severity"], [number, number, number]> = {
  critical: [212, 68, 55],
  warning: [201, 140, 34],
  positive: [58, 140, 92],
  info: IVY_BRAND.ivy800,
};

const SEVERITY_LABEL: Record<OrionBriefingItem["severity"], string> = {
  critical: "Needs attention",
  warning: "Worth reviewing",
  positive: "Going well",
  info: "For your information",
};

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - MARGIN - 8) {
    doc.addPage();
    return MARGIN + 4;
  }
  return y;
}

function wrapped(doc: jsPDF, text: string, x: number, y: number, maxWidth: number): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * 4.6;
}

export async function generateOrionBriefingPdf({
  briefing,
  generatedByName,
}: {
  briefing: OrionBriefing;
  generatedByName: string | null;
}) {
  const { logo, icon } = await loadIvyBrandAssets();
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const contentWidth = PAGE_WIDTH - MARGIN * 2;

  let y = drawBrandHeader(
    doc,
    logo,
    "Orion — Portfolio Briefing",
    `Generated ${formatDateTime(briefing.generatedAt)}${generatedByName ? ` by ${generatedByName}` : ""}`,
    PAGE_WIDTH,
    MARGIN
  );

  if (briefing.headline) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(...IVY_BRAND.ink);
    y = ensureSpace(doc, y, 14);
    y = wrapped(doc, briefing.headline, MARGIN, y, contentWidth) + 6;
  }

  for (const item of briefing.items) {
    y = ensureSpace(doc, y, 22);
    const color = SEVERITY_COLOR[item.severity];

    doc.setFillColor(...color);
    doc.rect(MARGIN, y - 3.2, 1.4, 12, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...color);
    doc.text(SEVERITY_LABEL[item.severity].toUpperCase(), MARGIN + 4, y);
    y += 4.8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...IVY_BRAND.ink);
    y = wrapped(doc, item.title, MARGIN + 4, y, contentWidth - 4) + 0.5;

    if (item.detail) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...IVY_BRAND.muted);
      y = wrapped(doc, item.detail, MARGIN + 4, y, contentWidth - 4);
    }

    if (item.leads?.length) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(...IVY_BRAND.ivy800);
      y = wrapped(doc, item.leads.map((l) => l.name).join(", "), MARGIN + 4, y + 1, contentWidth - 4);
    }
    y += 5;
  }

  if (briefing.recommendations.length > 0) {
    y = ensureSpace(doc, y, 16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...IVY_BRAND.ink);
    doc.text("Orion's recommendations", MARGIN, y);
    doc.setDrawColor(...IVY_BRAND.gold);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y + 2, MARGIN + 24, y + 2);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...IVY_BRAND.ink);
    for (const rec of briefing.recommendations) {
      y = ensureSpace(doc, y, 10);
      doc.setTextColor(...IVY_BRAND.gold);
      doc.text("—", MARGIN, y);
      doc.setTextColor(...IVY_BRAND.ink);
      y = wrapped(doc, rec, MARGIN + 5, y, contentWidth - 5) + 2.5;
    }
  }

  drawWatermarkOnAllPages(doc, icon);
  drawBrandFooter(doc, MARGIN, "Ivy Group CRM — Orion Portfolio Briefing");

  doc.save(`orion-portfolio-briefing-${new Date().toISOString().slice(0, 10)}.pdf`);
}
