"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { Delta, Spark } from "@/components/dashboard/tile-parts";
import { cn } from "@/lib/utils";

/**
 * One of the four stat tiles beside the hero: icon chip, label, the figure
 * (counts up), the change against last month, and a sparkline you can hover.
 */
export function StatTile({
  icon: Icon,
  label,
  value,
  format,
  previous,
  versus,
  goodWhenUp = true,
  points = false,
  caption,
  series,
  seriesLabels,
  warn = false,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  format?: (n: number) => string;
  previous?: number;
  versus?: string;
  goodWhenUp?: boolean;
  points?: boolean;
  caption?: string;
  series: number[];
  seriesLabels: string[];
  warn?: boolean;
  href: string;
}) {
  const showWarn = warn && value > 0;
  return (
    <Link href={href} className="group/stat block h-full rounded-[1.25rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
      <Card className="h-full">
        <CardContent className="flex h-full flex-col gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-500 ease-[var(--ease-orion-spring)] group-hover/stat:scale-110 group-hover/stat:-rotate-6",
                showWarn ? "bg-gold/20 text-[#8a6418] dark:text-gold-soft" : "bg-primary/14 text-primary dark:bg-evergreen-soft/16 dark:text-evergreen-soft"
              )}
            >
              <Icon className="size-4" />
            </span>
            <h2 className="truncate text-[13px] font-semibold text-muted-foreground">{label}</h2>
          </div>
          <p className="orion-figure text-[1.9rem] leading-none font-semibold tracking-tight tabular-nums">
            <AnimatedCounter value={value} formatter={format} />
          </p>
          {previous !== undefined && versus ? (
            <Delta current={value} previous={previous} versus={versus} goodWhenUp={goodWhenUp} points={points} />
          ) : (
            caption && <p className="text-xs text-muted-foreground">{caption}</p>
          )}
          <Spark
            values={series}
            labels={seriesLabels}
            format={format}
            color={showWarn ? "var(--gold)" : "var(--chart-1)"}
            className="mt-auto pt-1"
          />
        </CardContent>
      </Card>
    </Link>
  );
}
