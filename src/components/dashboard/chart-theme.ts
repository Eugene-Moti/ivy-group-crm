import type { CSSProperties } from "react";

export const CHART_INK = "var(--muted-foreground)";
export const CHART_GRID = "var(--border)";
// Name kept so existing chart imports don't churn; the primary series is now
// the brand evergreen (--chart-1), with gold reserved for highlights.
export const CHART_GOLD = "var(--chart-1)";

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
