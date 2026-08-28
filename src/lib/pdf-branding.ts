import jsPDF, { GState } from "jspdf";

const LOGO_PATH = "/ivy-group-logo-full.png";
const ICON_PATH = "/logo-icon.png";

export type ImageAsset = { dataUrl: string; width: number; height: number };

// Navy-charcoal + gold, matching src/app/globals.css's --ink/--ivy-900/
// --ivy-800/--gold tokens (which jsPDF can't read directly — hence this
// hand-kept RGB mirror; keep both in lockstep on any future palette change).
export const IVY_BRAND = {
  ink: [20, 22, 28] as [number, number, number],
  ivy900: [29, 32, 41] as [number, number, number],
  ivy800: [44, 48, 56] as [number, number, number],
  gold: [201, 165, 74] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
};

/** Shared jspdf-autotable header styling — a gold band with dark ink text, matching the letterhead. */
export const IVY_TABLE_HEAD_STYLES = {
  fillColor: IVY_BRAND.gold,
  textColor: IVY_BRAND.ink,
  fontStyle: "bold" as const,
};

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

async function fetchAsset(path: string): Promise<ImageAsset | null> {
  try {
    const res = await fetch(path);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read asset"));
      reader.readAsDataURL(blob);
    });
    const img = await loadImage(dataUrl);
    return { dataUrl, width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    return null;
  }
}

let cachedAssets: Promise<{ logo: ImageAsset | null; icon: ImageAsset | null }> | null = null;

/** Fetches the letterhead logo + watermark icon once per session and caches the result. */
export function loadIvyBrandAssets() {
  cachedAssets ??= Promise.all([fetchAsset(LOGO_PATH), fetchAsset(ICON_PATH)]).then(
    ([logo, icon]) => ({ logo, icon })
  );
  return cachedAssets;
}

/**
 * Letterhead-style header: logo centered at the top, title and subtitle
 * centered beneath it, closed off by a gold rule over a thin ink rule.
 * Returns the Y to start content from.
 */
export function drawBrandHeader(
  doc: jsPDF,
  logo: ImageAsset | null,
  title: string,
  subtitle: string,
  pageWidth: number,
  margin: number
): number {
  const topY = 10;
  const centerX = pageWidth / 2;
  let y = topY;

  if (logo) {
    const h = 16;
    const w = h * (logo.width / logo.height);
    doc.addImage(logo.dataUrl, "PNG", centerX - w / 2, y, w, h);
    y += h + 5;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...IVY_BRAND.ink);
  doc.text(title, centerX, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...IVY_BRAND.muted);
  doc.text(subtitle, centerX, y, { align: "center" });
  y += 5;

  doc.setDrawColor(...IVY_BRAND.gold);
  doc.setLineWidth(0.9);
  doc.line(margin, y, pageWidth - margin, y);
  y += 1.4;
  doc.setDrawColor(...IVY_BRAND.ivy900);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);

  return y + 8;
}

/** Stamps a consistent gold-rule footer with page numbers on every page — call last, after the watermark. */
export function drawBrandFooter(doc: jsPDF, margin: number, label = "Ivy Group CRM — Confidential") {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 10;

    doc.setDrawColor(...IVY_BRAND.gold);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...IVY_BRAND.muted);
    doc.text(label, margin, footerY);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, footerY, { align: "right" });
  }
}

/** Stamps a large, faint, centered icon watermark on every page the document currently has. */
export function drawWatermarkOnAllPages(doc: jsPDF, icon: ImageAsset | null) {
  if (!icon) return;

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const w = Math.min(pageWidth, pageHeight) * 0.75;
    const h = w * (icon.height / icon.width);
    const x = (pageWidth - w) / 2;
    const y = (pageHeight - h) / 2;

    doc.saveGraphicsState();
    doc.setGState(new GState({ opacity: 0.06 }));
    doc.addImage(icon.dataUrl, "PNG", x, y, w, h);
    doc.restoreGraphicsState();
  }
}
