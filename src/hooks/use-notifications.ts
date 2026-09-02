"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  computeNotifications,
  type NotificationActivity,
  type NotificationItem,
  type NotificationLead,
} from "@/lib/notifications";

const LEAD_COLUMNS =
  "id, first_name, last_name, phone, email, status, priority, lead_type, next_follow_up_at, created_at, updated_at";

/**
 * The same "needs attention" data source for both the notification bell and
 * the Dashboard's Needs Attention card — each mounts its own instance (its
 * own fetch + realtime channel, uniquely named so they don't collide), same
 * tradeoff every other page here already makes with useRealtimeLeadsRefresh
 * rather than threading a single subscription through a shared provider.
 */
export function useNotifications(enabled: boolean): {
  notifications: NotificationItem[];
  leads: NotificationLead[];
  activities: NotificationActivity[];
  isLoading: boolean;
} {
  const channelSuffix = useId();
  const [leads, setLeads] = useState<NotificationLead[]>([]);
  const [activities, setActivities] = useState<NotificationActivity[]>([]);
  const [soldLeadIds, setSoldLeadIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const supabase = createClient();

    async function load() {
      const [{ data: leadRows }, { data: activityRows }, { data: unitRows }] = await Promise.all([
        supabase.from("leads").select(LEAD_COLUMNS),
        supabase.from("activities").select("lead_id, created_at"),
        supabase.from("units_sold").select("lead_id"),
      ]);
      if (cancelled) return;
      setLeads((leadRows ?? []) as unknown as NotificationLead[]);
      setActivities((activityRows ?? []) as unknown as NotificationActivity[]);
      setSoldLeadIds(new Set((unitRows ?? []).map((r) => r.lead_id)));
      setIsLoading(false);
    }
    load();

    const channel = supabase
      .channel(`notifications-${channelSuffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "units_sold" }, load)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [enabled, channelSuffix]);

  const notifications = useMemo(
    () => computeNotifications(leads, activities, new Date(), soldLeadIds),
    [leads, activities, soldLeadIds]
  );

  return { notifications, leads, activities, isLoading };
}
