"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, CheckCircle2, OctagonAlert } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { useIsAdmin } from "@/components/providers/profile-provider";
import { computeNotifications, type NotificationActivity, type NotificationLead } from "@/lib/notifications";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const LEAD_COLUMNS =
  "id, first_name, last_name, phone, email, status, priority, next_follow_up_at, created_at";

export function NotificationBell() {
  const isAdmin = useIsAdmin();
  const [leads, setLeads] = useState<NotificationLead[]>([]);
  const [activities, setActivities] = useState<NotificationActivity[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const [{ data: leadRows }, { data: activityRows }] = await Promise.all([
        supabase.from("leads").select(LEAD_COLUMNS),
        supabase.from("activities").select("lead_id, created_at"),
      ]);
      if (cancelled) return;
      setLeads((leadRows ?? []) as unknown as NotificationLead[]);
      setActivities((activityRows ?? []) as unknown as NotificationActivity[]);
    }
    load();

    const channel = supabase
      .channel("notification-bell")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const notifications = useMemo(() => computeNotifications(leads, activities), [leads, activities]);
  const criticalCount = notifications.filter((n) => n.severity === "critical").length;
  const totalCount = notifications.length;

  if (!isAdmin) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell className="size-4.5" />
          {totalCount > 0 && (
            <span
              className={cn(
                "absolute top-1 right-1 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold text-white",
                criticalCount > 0 ? "bg-destructive" : "bg-gold text-ink"
              )}
            >
              {totalCount > 9 ? "9+" : totalCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 space-y-3 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold tracking-tight">Needs your attention</p>
          {totalCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {totalCount} item{totalCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {totalCount === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 className="size-6 text-[#3A8C5C]" />
            <p className="text-sm text-muted-foreground">All caught up. Nothing urgent right now.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {notifications.map((item) => {
              const Icon = item.severity === "critical" ? OctagonAlert : AlertTriangle;
              const color = item.severity === "critical" ? "text-destructive" : "text-gold";
              const border = item.severity === "critical" ? "border-l-destructive" : "border-l-gold";
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex gap-2.5 rounded-lg border border-border border-l-4 bg-card p-3 transition-colors hover:border-ring/50",
                      border
                    )}
                  >
                    <Icon className={cn("mt-0.5 size-4 shrink-0", color)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href="/reports?tab=full-analysis"
          onClick={() => setOpen(false)}
          className="block text-center text-xs text-gold hover:underline"
        >
          View full analysis report
        </Link>
      </PopoverContent>
    </Popover>
  );
}
