"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

const MAX_TILT_DEG = 5;

/**
 * Tilt + spotlight (from the brand board's motion lab): the tile leans a
 * few degrees toward the cursor and a soft gold light follows it across
 * the surface and border (.orion-tile in globals.css). Mouse/pen only —
 * on touch it simply stays put — and off entirely under reduced motion.
 */
export function SpotlightTile({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.dataset.live = "";
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    // Big tiles tilt less, so the hero doesn't swing like a door.
    const scale = Math.min(1, 320 / Math.max(r.width, r.height));
    el.style.setProperty("--ry", `${((x - 0.5) * MAX_TILT_DEG * 2 * scale).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - y) * MAX_TILT_DEG * 2 * scale).toFixed(2)}deg`);
  }

  function handleLeave() {
    const el = ref.current;
    if (!el) return;
    delete el.dataset.live;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }

  return (
    <div ref={ref} onPointerMove={handleMove} onPointerLeave={handleLeave} className={cn("orion-tile h-full", className)}>
      {children}
    </div>
  );
}
