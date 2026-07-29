-- Ivy Group CRM — client evidence (proof of ownership)
--
-- Some leads get contested later ("that's actually our client") — this adds
-- a place to attach dated proof per lead: a WhatsApp/call screenshot, a note
-- about a conversation, or both, each with its own "occurred at" date
-- (independent of when it was actually entered into the system, so
-- historical/backdated records can be logged accurately too).

create table public.lead_evidence (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  occurred_at timestamptz not null default now(),
  note text,
  file_path text,
  file_name text,
  file_type text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint lead_evidence_has_content check (note is not null or file_path is not null)
);

alter table public.lead_evidence enable row level security;

create policy "lead_evidence_select_authenticated"
  on public.lead_evidence for select
  to authenticated
  using (true);

create policy "lead_evidence_admin_write"
  on public.lead_evidence for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index lead_evidence_lead_id_idx on public.lead_evidence (lead_id);

-- Private storage bucket for the actual screenshot/file bytes. Signed URLs
-- are generated on demand (server for display, client for the PDF report)
-- rather than making this bucket public, since these are private client
-- conversations.
insert into storage.buckets (id, name, public)
values ('lead-evidence', 'lead-evidence', false)
on conflict (id) do nothing;

create policy "lead_evidence_files_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'lead-evidence');

create policy "lead_evidence_files_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'lead-evidence' and public.is_admin());

create policy "lead_evidence_files_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'lead-evidence' and public.is_admin());
