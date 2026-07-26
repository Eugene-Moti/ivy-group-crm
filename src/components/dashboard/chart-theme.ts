import type { CSSProperties } from "react";

export const CHART_INK = "var(--muted-foreground)";
export const CHART_GRID = "var(--border)";
export const CHART_GOLD = "var(--gold)";

export const chartTooltipStyle: CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  color: "var(--popover-foreground)",
  fontSize: "0.8rem",
  boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
};

export const chartLabelStyle: CSSProperties = {
  color: "var(--popover-foreground)",
  fontWeight: 500,
};
