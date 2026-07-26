import { addDays, endOfDay, isAfter, isBefore } from "date-fns";
import type { LeadWithRelations } from "@/lib/queries/leads";

const CLOSED = ["Closed - Won", "Closed - Lost"];

export function groupFollowUps(leads: LeadWithRelations[], now: Date) {
  const endOfToday = endOfDay(now);
  const weekOut = addDays(now, 7);

  const relevant = leads.filter(
    (l) => l.next_follow_up_at && !CLOSED.includes(l.status)
  );

  const overdue = relevant.filter(
    (l) => isBefore(new Date(l.next_follow_up_at!), now)
  );

  const dueToday = relevant.filter((l) => {
    const at = new Date(l.next_follow_up_at!);
    return !isBefore(at, now) && !isAfter(at, endOfToday);
  });

  const upcoming = relevant.filter((l) => {
    const at = new Date(l.next_follow_up_at!);
    return isAfter(at, endOfToday) && !isAfter(at, weekOut);
  });

  const byDate = (a: LeadWithRelations, b: LeadWithRelations) =>
    new Date(a.next_follow_up_at!).getTime() - new Date(b.next_follow_up_at!).getTime();

  return {
    overdue: overdue.sort(byDate),
    dueToday: dueToday.sort(byDate),
    upcoming: upcoming.sort(byDate),
  };
}
