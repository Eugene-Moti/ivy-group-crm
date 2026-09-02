"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ChevronDown, OctagonAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/lib/notifications";

/**
 * One notification, expandable to the exact leads behind its count — each
 * with its own one-line reason — instead of a bare number someone has to
 * go filter a table to decode. Shared by the notification bell and the
 * Dashboard's Needs Attention card so both stay in sync automatically.
 */
export function NotificationItemCard({
  item,
  onNavigate,
}: {
  item: NotificationItem;
  onNavigate?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = item.severity === "critical" ? OctagonAlert : AlertTriangle;
  const color = item.severity === "critical" ? "text-destructive" : "text-gold";
  const border = item.severity === "critical" ? "border-l-destructive" : "border-l-gold";
  const hasLeads = !!item.leads?.length;

  return (
    <div className={cn("rounded-lg border border-border border-l-4 bg-card", border)}>
      <div className="flex items-start gap-1.5 p-3">
        <Link
          href={item.href}
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-start gap-2.5"
        >
          <Icon className={cn("mt-0.5 size-4 shrink-0", color)} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">{item.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
          </div>
        </Link>
        {hasLeads && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Hide the exact leads" : "Show the exact leads"}
            className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
          >
            <ChevronDown className={cn("size-4 transition-transform", expanded && "rotate-180")} />
          </button>
        )}
      </div>
      {hasLeads && expanded && (
        <ul className="space-y-1.5 border-t border-border/60 px-3 py-2.5">
          {item.leads!.map((lead) => (
            <li
              key={lead.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs"
            >
              <Link
                href={`/leads/${lead.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-gold hover:underline"
              >
                {lead.name}
              </Link>
              <span className="text-right text-muted-foreground">{lead.reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
