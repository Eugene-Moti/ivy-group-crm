-- Ivy Group CRM — saved report queries (Phase 8)
-- Run once against the same project as the initial migration.

create table public.saved_queries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.saved_queries enable row level security;

-- Shared team library: anyone signed in can see all saved queries, but only
-- the creator (or an admin) can edit/delete one. Any signed-in user — viewer
-- or admin — can save a query: this bookmarks a personal report filter, it
-- does not mutate lead data, so it isn't gated by is_admin() like leads are.
create policy "saved_queries_select_authenticated"
  on public.saved_queries for select
  to authenticated
  using (true);

create policy "saved_queries_insert_own"
  on public.saved_queries for insert
  to authenticated
  with check (created_by = auth.uid());

create policy "saved_queries_update_own_or_admin"
  on public.saved_queries for update
  to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

create policy "saved_queries_delete_own_or_admin"
  on public.saved_queries for delete
  to authenticated
  using (created_by = auth.uid() or public.is_admin());
