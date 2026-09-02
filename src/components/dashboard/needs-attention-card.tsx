"use client";

import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, OctagonAlert, Sparkles } from "lucide-react";
import { useIsAdmin } from "@/components/providers/profile-provider";
import { useAssistant } from "@/components/providers/assistant-provider";
import { useNotifications } from "@/hooks/use-notifications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Everything the notification bell knows, surfaced right on the dashboard
 * instead of behind an icon someone has to think to click — the whole point
 * being a glance at this card should answer "does anything need me before I
 * go dig through Reports?" without a trip there.
 */
export function NeedsAttentionCard() {
  const isAdmin = useIsAdmin();
  const { openAssistant } = useAssistant();
  const { notifications, isLoading } = useNotifications(isAdmin);
  const criticalCount = notifications.filter((n) => n.severity === "critical").length;

  if (!isAdmin || isLoading) return null;

  if (notifications.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 text-success" />
        All caught up — nothing needs attention right now.
      </div>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Bell className="size-4" />
          Needs your attention
          {criticalCount > 0 && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-white">
              {criticalCount} urgent
            </span>
          )}
        </CardTitle>
        <button
          type="button"
          onClick={() =>
            openAssistant("Summarize what needs my attention right now and what to do about it.")
          }
          className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <Sparkles className="size-3" />
          Ask AI
        </button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {notifications.map((item) => {
            const Icon = item.severity === "critical" ? OctagonAlert : AlertTriangle;
            const color = item.severity === "critical" ? "text-destructive" : "text-gold";
            const border = item.severity === "critical" ? "border-l-destructive" : "border-l-gold";
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex gap-2.5 rounded-lg border border-border border-l-4 bg-background p-3 transition-colors hover:border-ring/50",
                  border
                )}
              >
                <Icon className={cn("mt-0.5 size-4 shrink-0", color)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
