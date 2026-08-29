-- Ivy Group CRM — lead documents (contracts, ID copies, offer letters)
--
-- Distinct from lead_evidence (dated proof of contact, used to establish
-- ownership when a lead is disputed) — this is the actual paperwork a deal
-- produces: signed contracts, ID/KRA PIN copies, offer letters, proof of
-- payment, title deeds. Same storage pattern as evidence (private bucket,
-- signed URLs generated on demand), but its own table rather than folding
-- into lead_evidence, so "Won leads with evidence" reporting keeps meaning
-- what it already means — uploading a contract shouldn't quietly also count
-- as contact evidence.

create table public.lead_documents (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  document_type text not null check (document_type in (
    'Contract', 'ID copy', 'Offer letter', 'Proof of payment', 'Title deed', 'Other'
  )),
  note text,
  file_path text not null,
  file_name text not null,
  file_type text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.lead_documents enable row level security;

create policy "lead_documents_select_authenticated"
  on public.lead_documents for select
  to authenticated
  using (true);

create policy "lead_documents_admin_write"
  on public.lead_documents for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index lead_documents_lead_id_idx on public.lead_documents (lead_id);

-- Private storage bucket, mirroring lead-evidence exactly — signed URLs on
-- demand rather than public, since contracts and ID copies are sensitive.
insert into storage.buckets (id, name, public)
values ('lead-documents', 'lead-documents', false)
on conflict (id) do nothing;

create policy "lead_documents_files_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'lead-documents');

create policy "lead_documents_files_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lead-documents' and public.is_admin());

create policy "lead_documents_files_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'lead-documents' and public.is_admin());
