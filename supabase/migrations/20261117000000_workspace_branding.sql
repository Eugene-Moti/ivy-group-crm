-- Orion CRM — workspace branding (the first piece of multi-company support)
--
-- Purely additive: one new table, one new storage bucket. No existing table
-- or row is touched. Ivy Group is inserted as the first (and for now only)
-- workspace; when Orion starts hosting more companies, leads/pipeline
-- stages/etc. will gain an org_id pointing at this table.
--
-- Each workspace controls its own display name, initials, tagline, logo and
-- accent colour. The app reads the first row and falls back to Ivy Group's
-- defaults if this migration hasn't been run yet, so it is safe to deploy
-- the code before running this.

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_name text,
  tagline text,
  logo_url text,
  accent text not null default 'evergreen',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.organizations (name, slug, short_name)
values ('Ivy Group', 'ivy-group', 'IG')
on conflict (slug) do nothing;

alter table public.organizations enable row level security;

-- Every signed-in user reads their workspace's branding (sidebar, emails).
-- The sign-in page reads it server-side with the service role.
drop policy if exists "organizations_select_authenticated" on public.organizations;
create policy "organizations_select_authenticated"
  on public.organizations for select
  to authenticated
  using (true);

drop policy if exists "organizations_update_admin" on public.organizations;
create policy "organizations_update_admin"
  on public.organizations for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Logos: public bucket (a logo is shown on the sign-in page before anyone
-- is signed in), writable by admins only.
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

drop policy if exists "branding_files_select_public" on storage.objects;
create policy "branding_files_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'branding');

drop policy if exists "branding_files_admin_insert" on storage.objects;
create policy "branding_files_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'branding' and public.is_admin());

drop policy if exists "branding_files_admin_update" on storage.objects;
create policy "branding_files_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());

drop policy if exists "branding_files_admin_delete" on storage.objects;
create policy "branding_files_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'branding' and public.is_admin());
