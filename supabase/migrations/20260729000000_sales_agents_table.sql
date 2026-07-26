-- Ivy Group CRM — sales agents as their own entity, separate from system users
--
-- "Assigned agent" originally pointed at profiles (i.e. a system login). The
-- marketing team actually assigns leads to sales managers who never log into
-- this system at all — they just need to exist as a name + contact record so
-- the admin can pick them in the dropdown and relay client details to them
-- directly (WhatsApp/call/email). This migration introduces a dedicated
-- lookup table for them and repoints leads.assigned_to at it.

create table public.sales_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

alter table public.sales_agents enable row level security;

create policy "sales_agents_select_authenticated"
  on public.sales_agents for select
  to authenticated
  using (true);

create policy "sales_agents_admin_write"
  on public.sales_agents for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Repoint leads.assigned_to from profiles to sales_agents. Existing values
-- were profile ids (system users), which are meaningless against the new
-- table, so they're cleared rather than guessed at — the admin re-assigns
-- from the new sales-agent list going forward.
alter table public.leads drop constraint leads_assigned_to_fkey;

update public.leads set assigned_to = null;

alter table public.leads
  add constraint leads_assigned_to_fkey
    foreign key (assigned_to) references public.sales_agents (id) on delete set null;
