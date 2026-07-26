-- Ivy Group CRM — initial schema
-- Run once against a fresh Supabase project (SQL Editor or `supabase db push`).

-- ============================================================================
-- Enums
-- ============================================================================

create type public.user_role as enum ('admin', 'viewer');

create type public.lead_priority as enum ('Hot', 'Warm', 'Cold');

create type public.lead_status as enum (
  'New Lead',
  'Contacted',
  'Qualified',
  'Viewing Scheduled',
  'Negotiating',
  'Offer Made',
  'Closed - Won',
  'Closed - Lost',
  'On Hold'
);

create type public.property_type as enum (
  'Apartment',
  'Townhouse',
  'Maisonette',
  'Bungalow',
  'Land / Plot',
  'Commercial',
  'Off-Plan',
  'Villa'
);

create type public.activity_type as enum (
  'note',
  'call',
  'email',
  'whatsapp',
  'viewing',
  'status_change'
);

-- ============================================================================
-- Tables
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  role public.user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

create table public.lead_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lead_source_id uuid references public.lead_sources (id),
  channel text,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  lead_source_id uuid references public.lead_sources (id),
  campaign_id uuid references public.campaigns (id),
  priority public.lead_priority not null default 'Warm',
  status public.lead_status not null default 'New Lead',
  property_type public.property_type,
  preferred_area text,
  budget_min numeric,
  budget_max numeric,
  bedrooms int,
  last_contact_at timestamptz,
  next_follow_up_at timestamptz,
  assigned_to uuid references public.profiles (id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  type public.activity_type not null,
  body text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- Indexes to support directory filtering, follow-up alerts, and dashboard queries.
create index leads_status_idx on public.leads (status);
create index leads_priority_idx on public.leads (priority);
create index leads_assigned_to_idx on public.leads (assigned_to);
create index leads_next_follow_up_at_idx on public.leads (next_follow_up_at);
create index leads_created_at_idx on public.leads (created_at);
create index activities_lead_id_idx on public.activities (lead_id);
create index activities_created_at_idx on public.activities (created_at);

-- ============================================================================
-- Helper functions & triggers
-- ============================================================================

-- SECURITY DEFINER so RLS policies on other tables can call this without
-- re-triggering profiles' own RLS (which would recurse).
create function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

-- Bootstraps a profile row for every new auth user, defaulting to viewer.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    'viewer'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic updated_at maintenance.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- Only admins may change a profile's role, regardless of which RLS policy
-- allowed the update through. auth.uid() is null for raw Postgres sessions
-- (SQL Editor, service-role connections, migrations) — those are trusted by
-- definition, so the guard only fires against an authenticated non-admin
-- trying to escalate a role from the app itself.
create function public.prevent_unauthorized_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'Only admins can change user roles';
  end if;
  return new;
end;
$$;

create trigger profiles_role_change_guard
  before update on public.profiles
  for each row execute function public.prevent_unauthorized_role_change();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.lead_sources enable row level security;
alter table public.campaigns enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;

-- profiles: everyone authenticated can read (needed for assignment dropdowns);
-- users can update their own row (role changes are blocked by the trigger
-- above unless the caller is an admin); admins can update any row.
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- lead_sources: read for all authenticated users, writes for admins only.
create policy "lead_sources_select_authenticated"
  on public.lead_sources for select
  to authenticated
  using (true);

create policy "lead_sources_admin_write"
  on public.lead_sources for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- campaigns: read for all authenticated users, writes for admins only.
create policy "campaigns_select_authenticated"
  on public.campaigns for select
  to authenticated
  using (true);

create policy "campaigns_admin_write"
  on public.campaigns for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- leads: read for all authenticated users, writes for admins only.
create policy "leads_select_authenticated"
  on public.leads for select
  to authenticated
  using (true);

create policy "leads_admin_write"
  on public.leads for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- activities: read for all authenticated users, writes for admins only.
create policy "activities_select_authenticated"
  on public.activities for select
  to authenticated
  using (true);

create policy "activities_admin_write"
  on public.activities for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================================
-- Realtime
-- ============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'leads'
  ) then
    alter publication supabase_realtime add table public.leads;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activities'
  ) then
    alter publication supabase_realtime add table public.activities;
  end if;
end $$;
