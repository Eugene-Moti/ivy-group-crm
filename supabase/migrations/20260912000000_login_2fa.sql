-- Ivy Group CRM — mandatory two-factor on the main login (email code)
--
-- Everyone signs in with email + password, then a 6-digit code is emailed
-- to their address; entering it clears the second factor for that session
-- (12 hours, bound to the Supabase session id). No enrolment — every user
-- already has an email.
--
-- NOTE: codes are sent via Resend. Without a verified sending domain in
-- Resend, only the Resend account owner's address actually receives mail —
-- verify a domain and set AUTH_2FA_FROM before relying on this for the
-- whole team, or use DISABLE_LOGIN_2FA=true meanwhile.

create table if not exists public.auth_2fa_codes (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  last_sent_at timestamptz not null default now(),
  sends_in_window integer not null default 1,
  window_start timestamptz not null default now()
);
alter table public.auth_2fa_codes enable row level security;
-- No policies: only the service-role client (the /api/2fa routes) ever
-- touches this table. RLS on with zero policies = deny all for anon/auth,
-- which is what we want.

create table if not exists public.auth_2fa_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  detail jsonb,
  at timestamptz not null default now()
);
alter table public.auth_2fa_log enable row level security;
create index if not exists auth_2fa_log_at_idx on public.auth_2fa_log (at desc);

drop policy if exists "auth_2fa_log_select" on public.auth_2fa_log;
create policy "auth_2fa_log_select" on public.auth_2fa_log
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "auth_2fa_log_insert_own" on public.auth_2fa_log;
create policy "auth_2fa_log_insert_own" on public.auth_2fa_log
  for insert to authenticated
  with check (user_id = auth.uid());
