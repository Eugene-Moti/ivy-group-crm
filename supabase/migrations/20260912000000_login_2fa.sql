-- Ivy Group CRM — mandatory two-factor on the main login (PIN)
--
-- Everyone signs in with email + password, then a PIN they set once —
-- entirely self-contained, no email service or domain needed. First login
-- after this ships forces a PIN to be set; after that, every sign-in (or
-- every 12 hours / new session) asks for it.

create table if not exists public.auth_2fa_pin (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  pin_hash text not null,
  pin_set_at timestamptz not null default now(),
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.auth_2fa_pin enable row level security;

-- A user manages only their own PIN; an admin can also read/delete rows —
-- the "reset" escape hatch for someone who's forgotten their PIN, since
-- there's no email fallback with this method.
drop policy if exists "auth_2fa_pin_self_or_admin" on public.auth_2fa_pin;
create policy "auth_2fa_pin_self_or_admin" on public.auth_2fa_pin
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

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
  -- self, or an admin logging an action they took on someone else (e.g. a reset)
  with check (user_id = auth.uid() or public.is_admin());
