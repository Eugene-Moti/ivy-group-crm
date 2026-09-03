"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, Info, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightSeverity = "critical" | "warning" | "positive" | "info";

/** The shape any report's "insight" needs — FullAnalysisInsight and PeriodInsight both already match this exactly. */
export type InsightLike = {
  severity: InsightSeverity;
  title: string;
  detail: string;
  leads?: { id: string; name: string }[];
};

const SEVERITY_META: Record<InsightSeverity, { icon: typeof AlertTriangle; className: string }> = {
  critical: { icon: OctagonAlert, className: "border-l-destructive text-destructive" },
  warning: { icon: AlertTriangle, className: "border-l-gold text-gold" },
  positive: { icon: CheckCircle2, className: "border-l-success text-success" },
  info: { icon: Info, className: "border-l-ivy-800 text-foreground" },
};

/** A severity-colored insight, expandable to the exact leads behind it when there are any — shared by Full Analysis and the Period Report so both stay visually identical. */
export function InsightCard({ insight }: { insight: InsightLike }) {
  const [expanded, setExpanded] = useState(false);
  const meta = SEVERITY_META[insight.severity];
  const Icon = meta.icon;
  const hasLeads = !!insight.leads?.length;

  return (
    <div className={cn("rounded-xl border border-border border-l-4 bg-card p-3", meta.className)}>
      <button
        type="button"
        onClick={() => hasLeads && setExpanded((v) => !v)}
        disabled={!hasLeads}
        className={cn("flex w-full items-start gap-3 text-left", hasLeads && "cursor-pointer")}
      >
        <Icon className="mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{insight.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{insight.detail}</p>
        </div>
        {hasLeads && (
          <ChevronDown
            className={cn(
              "mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          />
        )}
      </button>
      {hasLeads && expanded && (
        <ul className="mt-3 flex flex-wrap gap-1.5 border-t border-border/60 pt-3">
          {insight.leads!.map((lead) => (
            <li key={lead.id}>
              <Link
                href={`/leads/${lead.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-gold/50 hover:text-gold"
              >
                {lead.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
