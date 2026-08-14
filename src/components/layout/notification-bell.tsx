"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Bell, CheckCircle2, OctagonAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { useIsAdmin } from "@/components/providers/profile-provider";
import { useAssistant } from "@/components/providers/assistant-provider";
import {
  computeNotifications,
  type NotificationActivity,
  type NotificationItem,
  type NotificationLead,
} from "@/lib/notifications";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const LEAD_COLUMNS =
  "id, first_name, last_name, phone, email, status, priority, next_follow_up_at, created_at, updated_at";

function showToast(
  title: string,
  description: string,
  severity: NotificationItem["severity"],
  onView: () => void
) {
  const options = {
    description,
    duration: 10000,
    action: { label: "View", onClick: onView },
  };
  if (severity === "critical") {
    toast.error(title, options);
  } else {
    toast.warning(title, options);
  }
}

export function NotificationBell() {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const { openAssistant } = useAssistant();
  const [leads, setLeads] = useState<NotificationLead[]>([]);
  const [activities, setActivities] = useState<NotificationActivity[]>([]);
  const [open, setOpen] = useState(false);
  const seenIdsRef = useRef<Set<string> | null>(null);

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

  /**
   * Proactive popups, not just a passive badge — someone who never thinks to
   * click the bell should still get interrupted. On the first load each
   * session, one consolidated toast summarizes whatever's already urgent.
   * After that, only genuinely NEW categories (one that was empty and just
   * became non-empty) get their own toast — an item's count climbing
   * further doesn't re-alert, so this stays useful instead of noisy.
   */
  useEffect(() => {
    if (leads.length === 0 && activities.length === 0) return;
    const currentIds = new Set(notifications.map((n) => n.id));

    if (seenIdsRef.current === null) {
      const critical = notifications.filter((n) => n.severity === "critical");
      if (critical.length > 0) {
        showToast(
          `${critical.length} urgent item${critical.length === 1 ? "" : "s"} need attention`,
          critical.map((n) => n.title).join(" · "),
          "critical",
          () => router.push("/reports?tab=full-analysis")
        );
      }
    } else {
      const newlyAppeared = notifications.filter((n) => !seenIdsRef.current!.has(n.id));
      for (const item of newlyAppeared) {
        showToast(item.title, item.detail, item.severity, () => router.push(item.href));
      }
    }

    seenIdsRef.current = currentIds;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to notifications changing, router identity is stable
  }, [notifications]);

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

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <Link
            href="/reports?tab=full-analysis"
            onClick={() => setOpen(false)}
            className="text-xs text-gold hover:underline"
          >
            View full analysis report
          </Link>
          {totalCount > 0 && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openAssistant("Summarize what needs my attention right now and what to do about it.");
              }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="size-3" />
              Ask AI
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
