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
        "rounded-2xl transition-shadow hover:shadow-md",
        href && "transition-colors hover:border-gold/50"
      )}
    >
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p
            className={cn(
              "mt-1 text-2xl font-semibold tracking-tight tabular-nums",
              accent && "text-gold"
            )}
          >
            <AnimatedCounter value={value} formatter={formatter} />
          </p>
          {caption && (
            <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-gold/10 text-gold">
            <Icon className="size-4.5" />
          </div>
          {trend && trend.some((v) => v !== trend[0]) && (
            <KpiSparkline data={trend} color={accent ? "var(--destructive)" : "var(--gold)"} />
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl">
      {content}
    </Link>
  );
}
