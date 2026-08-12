import { differenceInCalendarDays, endOfDay } from "date-fns";
import { FOLLOW_UP_EXCLUDED_STATUS_KEYS, LOST_STATUS_KEY } from "@/lib/constants";
import { findAllDuplicateClusters } from "@/lib/duplicate-leads";

const STALE_OPEN_DAYS = 30;
const HOT_UNCONTACTED_DAYS = 7;
const VIEWING_STAGE_KEY = "viewing_scheduled";
const WIN_BACK_MONTHS = 6;
const WIN_BACK_DAYS = WIN_BACK_MONTHS * 30;

export type NotificationLead = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  status: string;
  priority: string;
  next_follow_up_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationActivity = { lead_id: string; created_at: string };

export type NotificationItem = {
  id: string;
  severity: "critical" | "warning";
  title: string;
  detail: string;
  href: string;
};

/**
 * The same categories of "needs attention" the Full Analysis report surfaces
 * — overdue follow-ups, hot leads gone quiet, possible duplicates, stale
 * open leads — condensed to one item per category for a notification
 * dropdown rather than a detailed report.
 */
export function computeNotifications(
  leads: NotificationLead[],
  activities: NotificationActivity[],
  now: Date = new Date()
): NotificationItem[] {
  // Excludes closed deals and resolved agents (their referral moved to an
  // active client record, so their own card isn't the one to chase anymore).
  const openLeads = leads.filter((l) => !FOLLOW_UP_EXCLUDED_STATUS_KEYS.includes(l.status));

  const lastActivityAtByLead = new Map<string, string>();
  const activityCountByLead = new Map<string, number>();
  for (const a of activities) {
    activityCountByLead.set(a.lead_id, (activityCountByLead.get(a.lead_id) ?? 0) + 1);
    const existing = lastActivityAtByLead.get(a.lead_id);
    if (!existing || new Date(a.created_at) > new Date(existing)) {
      lastActivityAtByLead.set(a.lead_id, a.created_at);
    }
  }

  const items: NotificationItem[] = [];

  const overdue = openLeads.filter(
    (l) => l.next_follow_up_at && new Date(l.next_follow_up_at) < now
  );
  if (overdue.length > 0) {
    items.push({
      id: "overdue-follow-ups",
      severity: "critical",
      title: `${overdue.length} overdue follow-up${overdue.length === 1 ? "" : "s"}`,
      detail: "Open leads whose next follow-up date has already passed.",
      href: "/follow-ups",
    });
  }

  const siteVisitsDue = openLeads.filter(
    (l) =>
      l.status === VIEWING_STAGE_KEY &&
      l.next_follow_up_at &&
      new Date(l.next_follow_up_at) <= endOfDay(now)
  );
  if (siteVisitsDue.length > 0) {
    items.push({
      id: "site-visits-due",
      severity: "critical",
      title: `${siteVisitsDue.length} site visit${siteVisitsDue.length === 1 ? "" : "s"} due`,
      detail: "Scheduled viewings due today or already passed.",
      href: "/leads?status=viewing_scheduled",
    });
  }

  const hotGoneQuiet = openLeads.filter((l) => {
    if (l.priority !== "Hot") return false;
    const lastActivity = lastActivityAtByLead.get(l.id);
    if (!lastActivity) return true;
    return differenceInCalendarDays(now, new Date(lastActivity)) > HOT_UNCONTACTED_DAYS;
  });
  if (hotGoneQuiet.length > 0) {
    items.push({
      id: "hot-gone-quiet",
      severity: "critical",
      title: `${hotGoneQuiet.length} Hot lead${hotGoneQuiet.length === 1 ? "" : "s"} without contact in ${HOT_UNCONTACTED_DAYS}+ days`,
      detail: "Hot-priority leads are the closest to converting — and the fastest to lose through inaction.",
      href: "/leads?priority=Hot",
    });
  }

  const duplicateClusters = findAllDuplicateClusters(
    leads.map((l) => ({ ...l, assigned_agent: null }))
  );
  if (duplicateClusters.length > 0) {
    items.push({
      id: "possible-duplicates",
      severity: "warning",
      title: `${duplicateClusters.length} possible duplicate lead${duplicateClusters.length === 1 ? "" : "s"}`,
      detail: "Leads sharing a phone number or email — worth a quick review.",
      href: "/reports?tab=duplicates",
    });
  }

  const staleOpen = openLeads.filter((l) => {
    const age = differenceInCalendarDays(now, new Date(l.created_at));
    return age > STALE_OPEN_DAYS && (activityCountByLead.get(l.id) ?? 0) === 0;
  });
  if (staleOpen.length > 0) {
    items.push({
      id: "stale-open-leads",
      severity: "warning",
      title: `${staleOpen.length} open lead${staleOpen.length === 1 ? "" : "s"} older than ${STALE_OPEN_DAYS} days with no notes`,
      detail: "No recorded contact history at all — either gone cold, or activity isn't being logged.",
      href: "/reports?tab=full-analysis",
    });
  }

  // updated_at is a proxy for "when it was lost" (no dedicated closed-at
  // timestamp) — close enough since a lost lead is rarely touched again
  // afterward, so a big gap since its last update reliably means it's been
  // sitting untouched since it closed.
  const winBackCandidates = leads.filter(
    (l) =>
      l.status === LOST_STATUS_KEY &&
      differenceInCalendarDays(now, new Date(l.updated_at)) > WIN_BACK_DAYS
  );
  if (winBackCandidates.length > 0) {
    items.push({
      id: "win-back-candidates",
      severity: "warning",
      title: `${winBackCandidates.length} lost lead${winBackCandidates.length === 1 ? "" : "s"} untouched for ${WIN_BACK_MONTHS}+ months`,
      detail: "Worth a re-engagement touch — budgets, financing, and the market all change over time.",
      href: `/leads?status=${LOST_STATUS_KEY}`,
    });
  }

  return items;
}
