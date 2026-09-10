-- Ivy Group CRM — mandatory two-factor on the main login
--
-- Everyone signs in with email + password as before, then proves a second
-- factor — a platform passkey (Windows Hello / Touch ID) or a numeric PIN
-- fallback — before the session is allowed anywhere. Enrolment is forced on
-- first login after this ships. Distinct from the Private-area tables
-- (which are gated by has_private_access()); these apply to every user.

create table if not exists public.auth_2fa_webauthn (
  credential_id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  public_key text not null,
  counter bigint not null default 0,
  transports text[],
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.auth_2fa_webauthn enable row level security;
create index if not exists auth_2fa_webauthn_user_idx on public.auth_2fa_webauthn (user_id);

create table if not exists public.auth_2fa_pin (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  pin_hash text not null,
  pin_set_at timestamptz not null default now(),
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.auth_2fa_pin enable row level security;

create table if not exists public.auth_2fa_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  detail jsonb,
  at timestamptz not null default now()
);
alter table public.auth_2fa_log enable row level security;
create index if not exists auth_2fa_log_at_idx on public.auth_2fa_log (at desc);

-- True once a user has any second factor set up. SECURITY DEFINER so the
-- proxy can call it for the signed-in user without RLS in the way.
create or replace function public.has_2fa()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.auth_2fa_webauthn where user_id = auth.uid())
      or exists (select 1 from public.auth_2fa_pin where user_id = auth.uid());
$$;
grant execute on function public.has_2fa() to authenticated;

-- RLS: a user manages only their own factors; an admin can read enrolment
-- state for everyone and clear anyone's factors (the "reset 2FA" action).
drop policy if exists "auth_2fa_webauthn_self_or_admin" on public.auth_2fa_webauthn;
create policy "auth_2fa_webauthn_self_or_admin" on public.auth_2fa_webauthn
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "auth_2fa_pin_self_or_admin" on public.auth_2fa_pin;
create policy "auth_2fa_pin_self_or_admin" on public.auth_2fa_pin
  for all to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "auth_2fa_log_select" on public.auth_2fa_log;
create policy "auth_2fa_log_select" on public.auth_2fa_log
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "auth_2fa_log_insert_own" on public.auth_2fa_log;
create policy "auth_2fa_log_insert_own" on public.auth_2fa_log
  for insert to authenticated
  with check (user_id = auth.uid());
