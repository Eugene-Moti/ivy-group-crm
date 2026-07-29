import jsPDF, { GState } from "jspdf";

const LOGO_PATH = "/ivy-group-logo-full.png";
const ICON_PATH = "/logo-icon.png";

export type ImageAsset = { dataUrl: string; width: number; height: number };

export const IVY_BRAND = {
  ink: [11, 31, 22] as [number, number, number],
  ivy900: [15, 42, 29] as [number, number, number],
  ivy800: [22, 56, 42] as [number, number, number],
  gold: [201, 162, 75] as [number, number, number],
  muted: [120, 120, 120] as [number, number, number],
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

/** Draws the logo + a gold rule at the top of the current page; returns the Y to start content from. */
export function drawBrandHeader(
  doc: jsPDF,
  logo: ImageAsset | null,
  title: string,
  subtitle: string,
  pageWidth: number,
  margin: number
): number {
  const topY = 10;
  const logoSize = 20;
  let textX = margin;

  if (logo) {
    const w = logoSize;
    const h = logoSize * (logo.height / logo.width);
    doc.addImage(logo.dataUrl, "PNG", margin, topY, w, h);
    textX = margin + w + 6;
  }

  doc.setFontSize(15);
  doc.setTextColor(...IVY_BRAND.ink);
  doc.text(title, textX, topY + 8);

  doc.setFontSize(9);
  doc.setTextColor(...IVY_BRAND.muted);
  doc.text(subtitle, textX, topY + 14);

  const ruleY = topY + logoSize + 4;
  doc.setDrawColor(...IVY_BRAND.gold);
  doc.setLineWidth(0.8);
  doc.line(margin, ruleY, pageWidth - margin, ruleY);

  return ruleY + 8;
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
