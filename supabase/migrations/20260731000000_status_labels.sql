-- Ivy Group CRM — admin-editable display labels for lead pipeline statuses
--
-- The 9 pipeline stages are a fixed Postgres enum (public.lead_status) and
-- stay that way — status still drives Kanban column identity, filtering,
-- colors, and "closed deal" logic everywhere. This table only lets admins
-- rename what each stage is CALLED on screen (Kanban headers, badges,
-- filters, reports, exports), without touching the underlying value.

create table public.status_labels (
  status public.lead_status primary key,
  label text not null
);

alter table public.status_labels enable row level security;

create policy "status_labels_select_authenticated"
  on public.status_labels for select
  to authenticated
  using (true);

create policy "status_labels_admin_write"
  on public.status_labels for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into public.status_labels (status, label) values
  ('New Lead', 'New Lead'),
  ('Contacted', 'Contacted'),
  ('Qualified', 'Qualified'),
  ('Viewing Scheduled', 'Viewing Scheduled'),
  ('Negotiating', 'Negotiating'),
  ('Offer Made', 'Offer Made'),
  ('Closed - Won', 'Closed - Won'),
  ('Closed - Lost', 'Closed - Lost'),
  ('On Hold', 'On Hold')
on conflict (status) do nothing;
