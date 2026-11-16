"use client";

/**
 * Fired the moment a lead becomes Won, from every path that can cause it
 * (Kanban drag, the edit form). An Orion star-burst: gold and evergreen
 * sparkles fly out from the deal, a ring of light expands, and faint
 * constellation lines join the stars before they fade — about 1.4s, then
 * the canvas removes itself. Skipped entirely under reduced motion.
 *
 * Pass the element that was won (e.g. the Kanban card) to burst from it;
 * with no target it bursts from the middle of the screen.
 */

const COLORS = ["#e6bf62", "#eed38c", "#6fbb8f", "#f6f4ee", "#dcaa45"];
const FRAMES = 84;

function sparkle(x: number, y: number, r: number): Path2D {
  const k = r * 0.28;
  return new Path2D(
    `M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`
  );
}

export function celebrateWon(target?: Element | null) {
  if (typeof window === "undefined") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

  let cx = window.innerWidth / 2;
  let cy = window.innerHeight / 2;
  if (target) {
    const r = target.getBoundingClientRect();
    cx = r.left + r.width / 2;
    cy = r.top + r.height / 2;
    // A gold sheen sweeps across the card itself.
    target.classList.remove("orion-sheen");
    void (target as HTMLElement).offsetWidth;
    target.classList.add("orion-sheen");
    window.setTimeout(() => target.classList.remove("orion-sheen"), 1200);
  }

  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "80",
  });
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const count = 26;
  const stars = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 3.5 + Math.random() * 5;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.6,
      r: 3 + Math.random() * 5,
      spin: Math.random() * 0.2 - 0.1,
      color: COLORS[i % COLORS.length],
    };
  });

  let frame = 0;
  const tick = () => {
    frame += 1;
    const life = Math.max(0, 1 - frame / FRAMES);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // Expanding ring of light.
    const ringR = 18 + (1 - life) * 140;
    ctx.strokeStyle = `rgba(230, 191, 98, ${0.5 * life * life})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
    ctx.stroke();

    for (const s of stars) {
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.93;
      s.vy = s.vy * 0.93 + 0.06;
    }

    // Constellation lines once the stars have spread out.
    if (frame > 14) {
      ctx.strokeStyle = `rgba(230, 191, 98, ${0.5 * life})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < stars.length; i += 3) {
        const a = stars[i];
        const b = stars[(i + 1) % stars.length];
        const c = stars[(i + 2) % stars.length];
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.lineTo(c.x, c.y);
      }
      ctx.stroke();
    }

    for (const s of stars) {
      ctx.globalAlpha = life;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      ctx.fill(sparkle(s.x, s.y, s.r * (0.6 + 0.4 * life)));
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (frame < FRAMES) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}
