"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** "KES 186.4M" — the headline style from the brand board. */
export function formatKESCompact(n: number): string {
  if (n >= 1_000_000_000) return `KES ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${Math.round(n / 1_000)}K`;
  return `KES ${Math.round(n)}`;
}

/** Bare compact figure for tight table cells: "60.6M". */
export function compactNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(Math.round(n));
}

/** Tile title row: a small muted heading on the left, an optional control on the right. */
export function TileHead({ title, children }: { title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-3">
      <h2 className="text-[13px] font-semibold text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

/** Chart / Table switch. Every chart on the dashboard has a table view, for screen readers and exact figures. */
export function ViewToggle<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-0.5 rounded-lg bg-foreground/[0.07] p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold",
            value === o.value && "bg-card text-foreground shadow-sm"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * "▲ 18.3% vs October". Arrow plus words, so the direction never depends on
 * colour alone. `points` compares percentages in points instead of percent.
 */
export function Delta({
  current,
  previous,
  versus,
  goodWhenUp = true,
  points = false,
}: {
  current: number;
  previous: number;
  versus: string;
  goodWhenUp?: boolean;
  points?: boolean;
}) {
  if (!points && previous === 0) {
    return <p className="text-xs text-muted-foreground">{current > 0 ? `New since ${versus}` : `None in ${versus} either`}</p>;
  }
  const change = points ? current - previous : ((current - previous) / previous) * 100;
  const flat = Math.abs(change) < 0.05;
  const up = change > 0;
  const good = flat ? null : up === goodWhenUp;
  return (
    <p className="flex flex-wrap items-center gap-1 text-xs font-semibold">
      <span className={cn(good === true && "text-success dark:text-evergreen-soft", good === false && "text-destructive", good === null && "text-muted-foreground")}>
        {flat ? "■ No change" : `${up ? "▲" : "▼"} ${Math.abs(change).toFixed(1)}${points ? " pts" : "%"}`}
      </span>
      <span className="font-normal text-muted-foreground">vs {versus}</span>
    </p>
  );
}

/**
 * Sparkline: a 2px line with a soft fill and a dot on the latest value.
 * Hover (or tap) any point to read it exactly.
 */
export function Spark({
  values,
  labels,
  format = (n) => Math.round(n).toLocaleString("en-US"),
  color = "var(--chart-1)",
  className,
}: {
  values: number[];
  labels: string[];
  format?: (n: number) => string;
  color?: string;
  className?: string;
}) {
  const gid = `spark-${useId().replace(/:/g, "")}`;
  const [hover, setHover] = useState<number | null>(null);
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({ x: (i / (values.length - 1)) * 100, y: 30 - ((v - min) / span) * 26 }));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const shown = hover ?? values.length - 1;
  const dot = pts[shown];

  return (
    <div className={cn("relative mt-auto h-9", className)} onPointerLeave={() => setHover(null)}>
      <svg viewBox="0 0 100 34" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={`${line} L100,34 L0,34 Z`} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <span
        className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card transition-[left,top] duration-150"
        style={{ left: `${dot.x}%`, top: `${(dot.y / 34) * 100}%`, background: color }}
      />
      {hover !== null && (
        <span
          className="pointer-events-none absolute -top-6 z-10 -translate-x-1/2 rounded-md bg-popover px-1.5 py-0.5 text-[10.5px] whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-border"
          style={{ left: `${Math.min(88, Math.max(12, dot.x))}%` }}
        >
          {labels[hover]} · <b className="font-semibold tabular-nums">{format(values[hover])}</b>
        </span>
      )}
      {/* Hit areas wider than the marks. */}
      <div className="absolute inset-0 flex">
        {values.map((_, i) => (
          <span key={i} className="h-full flex-1" onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)} />
        ))}
      </div>
    </div>
  );
}

export type BarRow = { key: string; label: string; value: number; color?: string };

/** Horizontal bar rows with the figure printed at the end. Bars grow in from the baseline. */
export function BarRows({ rows, labelWidth = "7rem", unit }: { rows: BarRow[]; labelWidth?: string; unit?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r, i) => (
        <li
          key={r.key}
          title={`${r.label}: ${r.value.toLocaleString("en-US")}${unit ? ` ${unit}` : ""}${total ? ` · ${((r.value / total) * 100).toFixed(1)}%` : ""}`}
          className="group grid items-center gap-2.5 rounded-md px-1 py-0.5 text-[12.5px] transition-colors hover:bg-foreground/[0.04]"
          style={{ gridTemplateColumns: `${labelWidth} minmax(0,1fr) 2.25rem` }}
        >
          <span className="truncate text-muted-foreground group-hover:text-foreground">{r.label}</span>
          <span className="h-3.5 overflow-hidden">
            <motion.span
              className="block h-full rounded-r-[4px]"
              style={{ background: r.color ?? "var(--chart-1)" }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(r.value > 0 ? 2 : 0, (r.value / max) * 100)}%` }}
              transition={{ duration: 0.9, delay: 0.15 + i * 0.04, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
          <span className="text-right font-mono text-xs font-semibold tabular-nums">{r.value.toLocaleString("en-US")}</span>
        </li>
      ))}
    </ul>
  );
}
