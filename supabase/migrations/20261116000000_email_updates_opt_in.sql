-- Orion CRM — per-user opt-in for the morning email
--
-- While Ask Orion (the AI briefing) is paused, the 9am cron sends a plain
-- summary instead: reminders due, follow-ups overdue / due today, and what's
-- coming up. Only people who switch this on in their own profile get it.
--
-- Additive only: one new column, default false, so no existing row changes
-- meaning and nobody starts receiving email until they opt in. Covered by
-- the existing profiles_update_own_or_admin policy (users update their own
-- row), so there's nothing new to grant.

alter table public.profiles
  add column if not exists email_updates boolean not null default false;
