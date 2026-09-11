-- Ivy Group CRM — per-person Private entry phrase
--
-- Replaces the single shared PRIVATE_ENTRY_PHRASE env var: each allowlisted
-- user now sets and owns their own phrase from Private > Security, so
-- there's no team-wide secret to share (or leak) and no redeploy needed to
-- add or change one. A brand-new allowlisted user with nothing set yet
-- still reaches /private the first time by typing it directly in the
-- address bar — same fallback as before.

create table if not exists public.private_entry_phrase (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  phrase_hash text not null,
  updated_at timestamptz not null default now()
);
alter table public.private_entry_phrase enable row level security;

drop policy if exists "private_entry_phrase_own" on public.private_entry_phrase;
create policy "private_entry_phrase_own" on public.private_entry_phrase
  for all to authenticated
  using (user_id = auth.uid() and public.has_private_access())
  with check (user_id = auth.uid() and public.has_private_access());
