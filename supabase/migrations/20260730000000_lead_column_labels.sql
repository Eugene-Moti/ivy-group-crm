-- Ivy Group CRM — admin-editable column header labels for the leads table
--
-- Admins can rename what the leads table's column headers say (e.g. "Property
-- type" -> "House Type") without touching the underlying field names. One row
-- per known column id; the app falls back to a hardcoded default label for
-- any column id that doesn't have a row yet (e.g. a column added after this
-- migration ran).

create table public.lead_column_labels (
  column_id text primary key,
  label text not null
);

alter table public.lead_column_labels enable row level security;

create policy "lead_column_labels_select_authenticated"
  on public.lead_column_labels for select
  to authenticated
  using (true);

create policy "lead_column_labels_admin_write"
  on public.lead_column_labels for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.lead_column_labels (column_id, label) values
  ('name', 'Name'),
  ('phone', 'Phone'),
  ('email', 'Email'),
  ('source', 'Source'),
  ('priority', 'Priority'),
  ('status', 'Status'),
  ('property_type', 'Property type'),
  ('area', 'Area'),
  ('budget', 'Budget'),
  ('bedrooms', 'Beds'),
  ('last_contact_at', 'Last contact'),
  ('next_follow_up_at', 'Next follow-up'),
  ('agent', 'Assigned agent'),
  ('created_at', 'Created')
on conflict (column_id) do nothing;
