import "server-only";
import { jsPDF } from "jspdf";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { formatDateTime } from "@/lib/format";
import {
  drawBrandFooter,
  drawBrandHeader,
  drawWatermarkOnAllPages,
  IVY_BRAND,
  type ImageAsset,
} from "@/lib/pdf-branding";
import type { OrionBriefing, OrionBriefingItem } from "@/lib/orion";

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

function pngDimensions(buf: Buffer): { width: number; height: number } {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function loadAssetServer(publicFileName: string): Promise<ImageAsset> {
  const filePath = path.join(process.cwd(), "public", publicFileName);
  const buf = await readFile(filePath);
  const { width, height } = pngDimensions(buf);
  return { dataUrl: `data:image/png;base64,${buf.toString("base64")}`, width, height };
}

let cachedServerAssets: Promise<{ logo: ImageAsset; icon: ImageAsset }> | null = null;

/** Node-side equivalent of loadIvyBrandAssets() in pdf-branding.ts — reads the same /public files directly off disk instead of fetch()+Image(), which don't exist outside a browser. */
function loadIvyBrandAssetsServer() {
  cachedServerAssets ??= Promise.all([
    loadAssetServer("ivy-group-logo-full.png"),
    loadAssetServer("logo-icon.png"),
  ]).then(([logo, icon]) => ({ logo, icon }));
  return cachedServerAssets;
}

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

/** Server-side counterpart to src/lib/orion-briefing-pdf.ts's generateOrionBriefingPdf — same layout, but returns a Buffer to attach to an email instead of triggering a browser download. */
export async function generateOrionBriefingPdfBuffer({
  briefing,
  generatedByName,
}: {
  briefing: OrionBriefing;
  generatedByName: string | null;
}): Promise<Buffer> {
  const { logo, icon } = await loadIvyBrandAssetsServer();
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

  if (briefing.items.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...IVY_BRAND.muted);
    y = wrapped(doc, "Nothing notable to flag right now — the pipeline looks steady.", MARGIN, y, contentWidth) + 6;
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

  return Buffer.from(doc.output("arraybuffer"));
}
