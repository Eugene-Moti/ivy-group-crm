"use client";

import confetti from "canvas-confetti";

/** Brand-toned confetti (gold + ivy, no rainbow) — deals closing is the one moment in the app worth making feel good. */
const CELEBRATION_COLORS = ["#c9a54a", "#dabb6f", "#2c3038", "#eef0f2"];

/**
 * Fired the moment a lead becomes Won, from every path that can cause it
 * (Kanban drag, the edit form, the AI Assistant's confirmed action) — a
 * short, tasteful burst rather than a takeover, so it celebrates without
 * getting in the way of whatever the person does next.
 */
export function celebrateWon() {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  const shared: confetti.Options = {
    colors: CELEBRATION_COLORS,
    disableForReducedMotion: true,
  };

  confetti({
    ...shared,
    particleCount: 70,
    spread: 65,
    startVelocity: 45,
    origin: { x: 0.2, y: 0.7 },
    angle: 60,
  });
  confetti({
    ...shared,
    particleCount: 70,
    spread: 65,
    startVelocity: 45,
    origin: { x: 0.8, y: 0.7 },
    angle: 120,
  });
}
