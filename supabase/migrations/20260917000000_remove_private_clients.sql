-- Ivy Group CRM — remove the Private clients tier
--
-- Reverses 20260911000000_private_clients.sql and 20260913000000_private_
-- entry_phrase.sql: every client goes back through the one shared pipeline.
-- Decision from the team: the confidential tier added real friction (a
-- separate unlock, a hidden entry phrase, a second place to look) for a
-- case better handled by simply assigning a sensitive client to a trusted
-- sales manager like any other lead. There are zero private leads at the
-- time this was written, so nothing needs to be reassigned first.

-- ---------------------------------------------------------------------------
-- 1. Restore the original RLS on leads + every child table this touched
-- ---------------------------------------------------------------------------
drop policy if exists "leads_select_visible" on public.leads;
create policy "leads_select_authenticated" on public.leads
  for select to authenticated using (true);

drop policy if exists "leads_admin_write" on public.leads;
create policy "leads_admin_write" on public.leads
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "activities_select_visible" on public.activities;
create policy "activities_select_authenticated" on public.activities
  for select to authenticated using (true);

drop policy if exists "activities_admin_write" on public.activities;
create policy "activities_admin_write" on public.activities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lead_evidence_select_visible" on public.lead_evidence;
create policy "lead_evidence_select_authenticated" on public.lead_evidence
  for select to authenticated using (true);

drop policy if exists "lead_evidence_admin_write" on public.lead_evidence;
create policy "lead_evidence_admin_write" on public.lead_evidence
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lead_documents_select_visible" on public.lead_documents;
create policy "lead_documents_select_authenticated" on public.lead_documents
  for select to authenticated using (true);

drop policy if exists "lead_documents_admin_write" on public.lead_documents;
create policy "lead_documents_admin_write" on public.lead_documents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "units_sold_select_visible" on public.units_sold;
create policy "units_sold_select_authenticated" on public.units_sold
  for select to authenticated using (true);

drop policy if exists "units_sold_admin_write" on public.units_sold;
create policy "units_sold_admin_write" on public.units_sold
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Storage
drop policy if exists "lead_evidence_files_select_visible" on storage.objects;
create policy "lead_evidence_files_select_authenticated" on storage.objects
  for select to authenticated using (bucket_id = 'lead-evidence');

drop policy if exists "lead_evidence_files_admin_insert" on storage.objects;
create policy "lead_evidence_files_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'lead-evidence' and public.is_admin());

drop policy if exists "lead_evidence_files_admin_delete" on storage.objects;
create policy "lead_evidence_files_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'lead-evidence' and public.is_admin());

drop policy if exists "lead_documents_files_select_visible" on storage.objects;
create policy "lead_documents_files_select_authenticated" on storage.objects
  for select to authenticated using (bucket_id = 'lead-documents');

drop policy if exists "lead_documents_files_admin_insert" on storage.objects;
create policy "lead_documents_files_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'lead-documents' and public.is_admin());

drop policy if exists "lead_documents_files_admin_delete" on storage.objects;
create policy "lead_documents_files_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'lead-documents' and public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Drop everything private-specific
-- ---------------------------------------------------------------------------
drop table if exists public.private_entry_phrase;
drop table if exists public.private_access_log;
drop table if exists public.private_webauthn_credentials;
drop table if exists public.private_area_credentials;
drop trigger if exists private_lead_access_protect_owner on public.private_lead_access;
drop table if exists public.private_lead_access;
drop function if exists public.protect_private_owner();
drop function if exists public.is_private_owner();
drop function if exists public.has_private_access();

drop index if exists public.leads_is_private_idx;
alter table public.leads
  drop column if exists is_private,
  drop column if exists codename,
  drop column if exists confidential_brief;

-- Storage buckets and their objects are left alone deliberately — there was
-- never a private lead, so lead-evidence / lead-documents hold nothing that
-- was ever private in the first place.
