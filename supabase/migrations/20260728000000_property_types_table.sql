-- Ivy Group CRM — Property Type becomes an admin-editable lookup table
--
-- Property Type was originally a fixed Postgres enum. Admins asked to be able
-- to add/remove property types themselves (same pattern as Lead Sources), so
-- this migration converts it to a proper lookup table and migrates existing
-- data across before dropping the old enum column.

create table if not exists public.property_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz not null default now()
);

alter table public.property_types enable row level security;

drop policy if exists "property_types_select_authenticated" on public.property_types;
create policy "property_types_select_authenticated"
  on public.property_types for select
  to authenticated
  using (true);

drop policy if exists "property_types_admin_write" on public.property_types;
create policy "property_types_admin_write"
  on public.property_types for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed with the existing enum's values so current data has somewhere to land.
insert into public.property_types (name) values
  ('Apartment'),
  ('Townhouse'),
  ('Maisonette'),
  ('Bungalow'),
  ('Land / Plot'),
  ('Commercial'),
  ('Off-Plan'),
  ('Villa')
on conflict (name) do nothing;

-- Add the new FK column, migrate existing leads across, then drop the old one.
alter table public.leads add column if not exists property_type_id uuid references public.property_types (id);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'leads' and column_name = 'property_type'
  ) then
    update public.leads l
    set property_type_id = pt.id
    from public.property_types pt
    where l.property_type::text = pt.name
      and l.property_type_id is null;

    alter table public.leads drop column property_type;
  end if;
end $$;

drop type if exists public.property_type;

create index if not exists leads_property_type_id_idx on public.leads (property_type_id);
