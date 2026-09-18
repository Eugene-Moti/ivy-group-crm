-- Ivy Group CRM — track which reminders the daily digest has already sent
--
-- Real bug found in production: a reminder scheduled after that day's 9am
-- digest had already run, for later that same day, fell into a gap —
-- reminders_due_today only matched exactly today's date, reminders_upcoming
-- only matched strictly future dates, so once the reminder's date passed
-- it was invisible in both buckets forever. It never appeared in any
-- digest email.
--
-- notified_at fixes this at the source: the digest cron now selects every
-- reminder that hasn't been notified yet, regardless of how overdue it is,
-- and marks it notified once it's actually been included in a sent email.
-- Nothing falls through a same-day gap, and nothing repeats once sent.

alter table public.lead_reminders
  add column notified_at timestamptz;
