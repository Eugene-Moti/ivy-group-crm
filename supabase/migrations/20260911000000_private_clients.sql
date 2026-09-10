-- Ivy Group CRM — private clients (confidential, allowlist-gated)
--
-- A tier of clients handled entirely in-house: never assigned to a sales
-- manager, never surfaced in any shared view, invisible even to admins
-- unless they are named on an explicit allowlist. That allowlist plus
-- these RLS policies are the actual enforcement — the PIN / biometric gate
-- in the app is a second factor layered on top for the people who ARE
-- allowed, not the lock itself.
--
-- After this runs, only the profile with email erickmoti3609@gmail.com can
-- see private clients (as owner). Everyone else — every other admin
-- included — gets exactly what they get today, because every existing lead
-- has is_private = false.

-- ---------------------------------------------------------------------------
-- 1. Columns on leads
-- ---------------------------------------------------------------------------
alter table public.leads
  add column if not exists is_private boolean not null default false,
  add column if not exists codename text,
  add column if not exists confidential_brief text;

create index if not exists leads_is_private_idx on public.leads (is_private);

-- ---------------------------------------------------------------------------
-- 2. Allowlist, credentials, audit log
-- ---------------------------------------------------------------------------
create table if not exists public.private_lead_access (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  is_owner boolean not null default false,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now()
);
alter table public.private_lead_access enable row level security;

create table if not exists public.private_area_credentials (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  pin_hash text,
  pin_set_at timestamptz,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.private_area_credentials enable row level security;

create table if not exists public.private_webauthn_credentials (
  credential_id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  public_key text not null,
  counter bigint not null default 0,
  transports text[],
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.private_webauthn_credentials enable row level security;
create index if not exists private_webauthn_credentials_user_idx
  on public.private_webauthn_credentials (user_id);

create table if not exists public.private_access_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  action text not null,
  detail jsonb,
  at timestamptz not null default now()
);
alter table public.private_access_log enable row level security;
create index if not exists private_access_log_at_idx on public.private_access_log (at desc);

-- ---------------------------------------------------------------------------
-- 3. Helper functions (SECURITY DEFINER so policies on other tables can call
--    them without recursing through private_lead_access's own RLS)
-- ---------------------------------------------------------------------------
create or replace function public.has_private_access()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.private_lead_access where user_id = auth.uid());
$$;
grant execute on function public.has_private_access() to authenticated;

create or replace function public.is_private_owner()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.private_lead_access where user_id = auth.uid() and is_owner);
$$;
grant execute on function public.is_private_owner() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS on the new tables
-- ---------------------------------------------------------------------------
drop policy if exists "private_lead_access_select" on public.private_lead_access;
create policy "private_lead_access_select" on public.private_lead_access
  for select to authenticated using (public.has_private_access());

drop policy if exists "private_lead_access_owner_write" on public.private_lead_access;
create policy "private_lead_access_owner_write" on public.private_lead_access
  for all to authenticated
  using (public.is_private_owner())
  with check (public.is_private_owner());

-- An owner can't be deleted or demoted (even by themselves) — that would
-- lock the whole feature out. Transfer by granting a second owner first.
create or replace function public.protect_private_owner()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' and old.is_owner then
    raise exception 'Cannot remove a private-area owner. Grant another owner first.';
  end if;
  if tg_op = 'UPDATE' and old.is_owner and not new.is_owner then
    raise exception 'Cannot revoke owner status. Grant another owner first.';
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists private_lead_access_protect_owner on public.private_lead_access;
create trigger private_lead_access_protect_owner
  before update or delete on public.private_lead_access
  for each row execute function public.protect_private_owner();

drop policy if exists "private_area_credentials_own" on public.private_area_credentials;
create policy "private_area_credentials_own" on public.private_area_credentials
  for all to authenticated
  using (user_id = auth.uid() and public.has_private_access())
  with check (user_id = auth.uid() and public.has_private_access());

drop policy if exists "private_webauthn_credentials_own" on public.private_webauthn_credentials;
create policy "private_webauthn_credentials_own" on public.private_webauthn_credentials
  for all to authenticated
  using (user_id = auth.uid() and public.has_private_access())
  with check (user_id = auth.uid() and public.has_private_access());

drop policy if exists "private_access_log_owner_select" on public.private_access_log;
create policy "private_access_log_owner_select" on public.private_access_log
  for select to authenticated using (public.is_private_owner());

drop policy if exists "private_access_log_insert_own" on public.private_access_log;
create policy "private_access_log_insert_own" on public.private_access_log
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_private_access());

-- ---------------------------------------------------------------------------
-- 5. Rewrite RLS on leads + child tables so private rows are invisible
--    unless has_private_access()
-- ---------------------------------------------------------------------------
drop policy if exists "leads_select_authenticated" on public.leads;
create policy "leads_select_visible" on public.leads
  for select to authenticated
  using (is_private = false or public.has_private_access());

drop policy if exists "leads_admin_write" on public.leads;
create policy "leads_admin_write" on public.leads
  for all to authenticated
  using (public.is_admin() and (is_private = false or public.has_private_access()))
  with check (public.is_admin() and (is_private = false or public.has_private_access()));

drop policy if exists "activities_select_authenticated" on public.activities;
create policy "activities_select_visible" on public.activities
  for select to authenticated
  using (exists (
    select 1 from public.leads l
    where l.id = activities.lead_id and (l.is_private = false or public.has_private_access())
  ));

drop policy if exists "activities_admin_write" on public.activities;
create policy "activities_admin_write" on public.activities
  for all to authenticated
  using (public.is_admin() and exists (
    select 1 from public.leads l
    where l.id = activities.lead_id and (l.is_private = false or public.has_private_access())
  ))
  with check (public.is_admin() and exists (
    select 1 from public.leads l
    where l.id = activities.lead_id and (l.is_private = false or public.has_private_access())
  ));

drop policy if exists "lead_evidence_select_authenticated" on public.lead_evidence;
create policy "lead_evidence_select_visible" on public.lead_evidence
  for select to authenticated
  using (exists (
    select 1 from public.leads l
    where l.id = lead_evidence.lead_id and (l.is_private = false or public.has_private_access())
  ));

drop policy if exists "lead_evidence_admin_write" on public.lead_evidence;
create policy "lead_evidence_admin_write" on public.lead_evidence
  for all to authenticated
  using (public.is_admin() and exists (
    select 1 from public.leads l
    where l.id = lead_evidence.lead_id and (l.is_private = false or public.has_private_access())
  ))
  with check (public.is_admin() and exists (
    select 1 from public.leads l
    where l.id = lead_evidence.lead_id and (l.is_private = false or public.has_private_access())
  ));

drop policy if exists "lead_documents_select_authenticated" on public.lead_documents;
create policy "lead_documents_select_visible" on public.lead_documents
  for select to authenticated
  using (exists (
    select 1 from public.leads l
    where l.id = lead_documents.lead_id and (l.is_private = false or public.has_private_access())
  ));

drop policy if exists "lead_documents_admin_write" on public.lead_documents;
create policy "lead_documents_admin_write" on public.lead_documents
  for all to authenticated
  using (public.is_admin() and exists (
    select 1 from public.leads l
    where l.id = lead_documents.lead_id and (l.is_private = false or public.has_private_access())
  ))
  with check (public.is_admin() and exists (
    select 1 from public.leads l
    where l.id = lead_documents.lead_id and (l.is_private = false or public.has_private_access())
  ));

drop policy if exists "units_sold_select_authenticated" on public.units_sold;
create policy "units_sold_select_visible" on public.units_sold
  for select to authenticated
  using (exists (
    select 1 from public.leads l
    where l.id = units_sold.lead_id and (l.is_private = false or public.has_private_access())
  ));

drop policy if exists "units_sold_admin_write" on public.units_sold;
create policy "units_sold_admin_write" on public.units_sold
  for all to authenticated
  using (public.is_admin() and exists (
    select 1 from public.leads l
    where l.id = units_sold.lead_id and (l.is_private = false or public.has_private_access())
  ))
  with check (public.is_admin() and exists (
    select 1 from public.leads l
    where l.id = units_sold.lead_id and (l.is_private = false or public.has_private_access())
  ));

-- ---------------------------------------------------------------------------
-- 6. Storage: the same visibility rule on the actual file bytes
--    (evidence + documents both store objects under a `<lead_id>/...` path)
-- ---------------------------------------------------------------------------
drop policy if exists "lead_evidence_files_select_authenticated" on storage.objects;
create policy "lead_evidence_files_select_visible" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lead-evidence'
    and exists (
      select 1 from public.leads l
      where l.id::text = (storage.foldername(name))[1]
        and (l.is_private = false or public.has_private_access())
    )
  );

drop policy if exists "lead_evidence_files_admin_insert" on storage.objects;
create policy "lead_evidence_files_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lead-evidence' and public.is_admin()
    and exists (
      select 1 from public.leads l
      where l.id::text = (storage.foldername(name))[1]
        and (l.is_private = false or public.has_private_access())
    )
  );

drop policy if exists "lead_evidence_files_admin_delete" on storage.objects;
create policy "lead_evidence_files_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lead-evidence' and public.is_admin()
    and exists (
      select 1 from public.leads l
      where l.id::text = (storage.foldername(name))[1]
        and (l.is_private = false or public.has_private_access())
    )
  );

drop policy if exists "lead_documents_files_select_authenticated" on storage.objects;
create policy "lead_documents_files_select_visible" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lead-documents'
    and exists (
      select 1 from public.leads l
      where l.id::text = (storage.foldername(name))[1]
        and (l.is_private = false or public.has_private_access())
    )
  );

drop policy if exists "lead_documents_files_admin_insert" on storage.objects;
create policy "lead_documents_files_admin_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'lead-documents' and public.is_admin()
    and exists (
      select 1 from public.leads l
      where l.id::text = (storage.foldername(name))[1]
        and (l.is_private = false or public.has_private_access())
    )
  );

drop policy if exists "lead_documents_files_admin_delete" on storage.objects;
create policy "lead_documents_files_admin_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'lead-documents' and public.is_admin()
    and exists (
      select 1 from public.leads l
      where l.id::text = (storage.foldername(name))[1]
        and (l.is_private = false or public.has_private_access())
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Bootstrap the owner
-- ---------------------------------------------------------------------------
insert into public.private_lead_access (user_id, is_owner, granted_at)
select id, true, now() from public.profiles where lower(email) = 'erickmoti3609@gmail.com'
on conflict (user_id) do update set is_owner = true;
