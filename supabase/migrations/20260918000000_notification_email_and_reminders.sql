-- Ivy Group CRM — admin notification email + lead reminders
--
-- Two small, independent additions:
-- 1. profiles.notification_email: where an admin wants Orion's daily
--    briefing sent, if different from their login email. Falls back to
--    `email` when unset. Already covered by the existing
--    profiles_update_own_or_admin policy from the init schema — nothing
--    new to grant.
-- 2. lead_reminders: a lightweight "remind me about this site visit /
--    meeting" note tied to a lead, independent of pipeline stage or
--    next_follow_up_at, surfaced in Orion's daily 9am briefing rather than
--    a separate real-time push (the project's Vercel plan's free cron
--    tier only fires once a day, so precise same-day timing isn't
--    available without extra infrastructure).

alter table public.profiles
  add column notification_email text;

create table public.lead_reminders (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  title text not null,
  notes text,
  remind_at timestamptz not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index lead_reminders_remind_at_idx on public.lead_reminders (remind_at);
create index lead_reminders_lead_id_idx on public.lead_reminders (lead_id);

alter table public.lead_reminders enable row level security;

create policy "lead_reminders_select_authenticated" on public.lead_reminders
  for select to authenticated using (true);

create policy "lead_reminders_admin_write" on public.lead_reminders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
