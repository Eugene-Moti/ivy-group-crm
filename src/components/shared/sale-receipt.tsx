"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { OrionMark } from "@/components/brand/orion-mark";
import { useWorkspace } from "@/components/providers/workspace-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { formatKES } from "@/lib/format";

export type SaleReceiptData = {
  id: string;
  clientName: string;
  project: string | null;
  unitNumber: string;
  unitSize: string | null;
  amount: number;
  saleType: string;
  salesManager: string | null;
  soldAt: string; // yyyy-mm-dd
};

const EVENT = "orion:sale-receipt";

/** Plays the receipt for a sale that was just recorded (see <SaleReceiptHost>). */
export function showSaleReceipt(data: SaleReceiptData) {
  window.dispatchEvent(new CustomEvent<SaleReceiptData>(EVENT, { detail: data }));
}

const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

function receiptNumber(id: string) {
  return `SALE-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

function soldLabel(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The "print receipt" moment from the brand board: after a unit sale is
 * recorded, a small Orion printer feeds out a sale slip line by line, then
 * a SOLD stamp lands on it. Mounted once in the app shell and triggered by
 * showSaleReceipt(), so it plays even though the sale form has already
 * closed. No bonus figures appear on the slip. Under reduced motion the
 * slip simply appears.
 */
export function SaleReceiptHost() {
  const workspace = useWorkspace();
  const [data, setData] = useState<SaleReceiptData | null>(null);
  const [printing, setPrinting] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onReceipt = (e: Event) => setData((e as CustomEvent<SaleReceiptData>).detail);
    window.addEventListener(EVENT, onReceipt);
    return () => window.removeEventListener(EVENT, onReceipt);
  }, []);

  const play = useCallback(async () => {
    const paper = paperRef.current;
    const stamp = stampRef.current;
    if (!paper || !stamp) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stamp.style.opacity = "0.88";
      return;
    }
    paper.getAnimations().forEach((a) => a.cancel());
    stamp.getAnimations().forEach((a) => a.cancel());
    stamp.style.opacity = "0";
    setPrinting(true);

    // Feed the paper out in little steps, like a thermal printer.
    const steps = 16;
    const frames: Keyframe[] = [{ transform: "translateY(-100%)", offset: 0 }];
    for (let i = 1; i <= steps; i++) {
      const y = -100 + (100 * i) / steps;
      frames.push({ transform: `translateY(${y}%)`, offset: (i - 0.5) / steps });
      frames.push({ transform: `translateY(${y}%)`, offset: i / steps });
    }
    await paper.animate(frames, { duration: 2000, easing: "linear" }).finished.catch(() => {});
    setPrinting(false);
    await new Promise((r) => setTimeout(r, 160));

    stamp.style.opacity = "";
    await stamp
      .animate(
        [
          { opacity: 0, transform: "translate(-50%,-50%) scale(2.6) rotate(-24deg)" },
          { opacity: 0.88, transform: "translate(-50%,-50%) scale(1) rotate(-12deg)" },
        ],
        { duration: 230, easing: "cubic-bezier(.55,0,.8,.2)", fill: "forwards" }
      )
      .finished.catch(() => {});
    paper.animate(
      [
        { transform: "none" },
        { transform: "translateY(3px) rotate(.5deg)" },
        { transform: "translateY(-1px) rotate(-.2deg)" },
        { transform: "none" },
      ],
      { duration: 260, easing: EASE }
    );
  }, []);

  // Start once the dialog's content has mounted.
  useEffect(() => {
    if (!data) return;
    const id = requestAnimationFrame(() => void play());
    return () => cancelAnimationFrame(id);
  }, [data, play]);

  function handlePrint() {
    const node = paperRef.current;
    if (!node) return;
    const win = window.open("", "_blank", "width=420,height=640");
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><title>${receiptNumber(data!.id)}</title><style>body{font:12px/1.6 ui-monospace,Menlo,monospace;color:#1c1c19;padding:24px;max-width:320px;margin:auto}.ln{display:flex;justify-content:space-between;gap:8px}.ln span:first-child{color:#5f5c53}hr{border:0;border-top:1px dashed #c7c2b5;margin:8px 0}.ph{text-align:center}.ph b{font-size:16px;letter-spacing:.18em}.tot{font-weight:700;font-size:13px}[data-noprint]{display:none}</style></head><body>${node.innerHTML}</body></html>`
    );
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <Dialog open={!!data} onOpenChange={(open) => !open && setData(null)}>
      <DialogContent className="max-w-sm overflow-hidden border-0 bg-transparent p-0 shadow-none ring-0 sm:max-w-sm" showCloseButton={false}>
        <DialogTitle className="sr-only">Sale recorded</DialogTitle>
        <DialogDescription className="sr-only">
          {data ? `${data.unitNumber} sold to ${data.clientName} for ${formatKES(data.amount)}.` : ""}
        </DialogDescription>
        {data && (
          <div className="flex flex-col items-center gap-4 p-2">
            {/* Printer */}
            <div className="flex w-full max-w-[300px] flex-col items-center">
              <div className="relative z-10 h-14 w-full rounded-t-2xl rounded-b-lg bg-gradient-to-b from-[#2c322e] to-[#151815] shadow-[0_10px_24px_-14px_rgb(0_0_0/0.6),inset_0_1px_0_rgb(255_255_255/0.08)]">
                <span className="absolute top-3.5 left-4 flex items-center gap-2 font-display text-[13px] tracking-[0.16em] text-[#e9e5da]">
                  <OrionMark className="size-4" /> ORION
                </span>
                <span className="orion-printer-led absolute top-[18px] right-[18px] size-2 rounded-full" data-busy={printing ? "" : undefined} />
                <span className="absolute right-5 bottom-2 left-5 h-[5px] rounded-sm bg-[#050605] shadow-[inset_0_1px_2px_#000]" />
              </div>
              <div className="-mt-1.5 w-[calc(100%-44px)] overflow-hidden pb-3">
                <div
                  ref={paperRef}
                  className="relative bg-[#fbfaf6] px-4 pt-4 pb-3 font-mono text-[11.5px] leading-[1.6] text-[#1c1c19] shadow-[0_8px_18px_-10px_rgb(0_0_0/0.35)]"
                >
                  <div className="ph mb-2 flex flex-col items-center gap-0.5 text-center">
                    <b className="font-display text-base font-normal tracking-[0.18em] uppercase">{workspace.name}</b>
                    <span>Sale confirmation</span>
                    <span>No. {receiptNumber(data.id)}</span>
                  </div>
                  <div className="ln flex justify-between gap-2"><span className="text-[#5f5c53]">Date</span><span>{soldLabel(data.soldAt)}</span></div>
                  <div className="ln flex justify-between gap-2"><span className="text-[#5f5c53]">Client</span><span className="truncate">{data.clientName}</span></div>
                  {data.project && (
                    <div className="ln flex justify-between gap-2"><span className="text-[#5f5c53]">Project</span><span className="truncate">{data.project}</span></div>
                  )}
                  <div className="ln flex justify-between gap-2">
                    <span className="text-[#5f5c53]">Unit</span>
                    <span className="truncate">{data.unitNumber}{data.unitSize ? ` · ${data.unitSize}` : ""}</span>
                  </div>
                  <hr className="my-2 border-0 border-t border-dashed border-[#c7c2b5]" />
                  <div className="ln flex justify-between gap-2"><span className="text-[#5f5c53]">Sale type</span><span>{data.saleType}</span></div>
                  {data.salesManager && (
                    <div className="ln flex justify-between gap-2"><span className="text-[#5f5c53]">Sales manager</span><span className="truncate">{data.salesManager}</span></div>
                  )}
                  <hr className="my-2 border-0 border-t border-dashed border-[#c7c2b5]" />
                  <div className="ln tot flex justify-between gap-2 text-[13px] font-semibold"><span>Unit price</span><span>{formatKES(data.amount)}</span></div>
                  <div className="orion-barcode mt-2.5 h-6" data-noprint />
                  <p className="mt-1.5 text-center text-[10px] text-[#7d796e]">Recorded in Orion CRM</p>
                  <div
                    ref={stampRef}
                    className="pointer-events-none absolute top-[55%] left-[60%] rounded-lg border-[3px] border-[#1a6a40] px-3 pt-0.5 font-display text-2xl tracking-[0.2em] text-[#1a6a40] opacity-0 mix-blend-multiply"
                    style={{ transform: "translate(-50%,-50%) rotate(-12deg)" }}
                    data-noprint
                  >
                    SOLD
                  </div>
                  <div className="orion-paper-edge absolute right-0 -bottom-2.5 left-0 h-2.5" data-noprint />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="bg-background" onClick={handlePrint} disabled={printing}>
                <Printer />
                Print
              </Button>
              <Button onClick={() => setData(null)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
