import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/dashboard/animated-counter";
import { KpiSparkline } from "@/components/dashboard/kpi-sparkline";
import { cn } from "@/lib/utils";

export function KpiCard({
  icon: Icon,
  label,
  value,
  formatter,
  caption,
  accent = false,
  trend,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  formatter?: (n: number) => string;
  caption?: string;
  accent?: boolean;
  trend?: number[];
  href?: string;
}) {
  const content = (
    <Card
      className={cn(
        "h-full rounded-2xl",
        href && "transition-colors"
      )}
    >
      <CardContent className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p
              className={cn(
                "mt-1 text-3xl font-semibold tracking-tight tabular-nums",
                accent && "text-destructive"
              )}
            >
              <AnimatedCounter value={value} formatter={formatter} />
            </p>
            {caption && (
              <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
            )}
          </div>
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-xl",
              accent ? "bg-destructive/12 text-destructive" : "bg-evergreen-soft/15 text-evergreen-soft"
            )}
          >
            <Icon className="size-4.5" />
          </div>
        </div>
        {trend && trend.some((v) => v !== trend[0]) && (
          // Full-width along the bottom so tall bento tiles stay balanced.
          <div className="mt-auto">
            <KpiSparkline data={trend} color={accent ? "var(--destructive)" : "var(--chart-1)"} className="h-14 w-full" />
            <p className="mt-1 text-[11px] text-muted-foreground">Last 7 days</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
      {content}
    </Link>
  );
}
