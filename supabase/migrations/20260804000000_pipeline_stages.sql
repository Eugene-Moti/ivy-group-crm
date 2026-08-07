-- Ivy Group CRM — pipeline stages become admin-manageable
--
-- Pipeline status was a fixed Postgres enum (public.lead_status). Admins can
-- now add/rename/reorder/delete stages from Settings, same as Projects and
-- Lead sources — except "New Lead" (the start) and "Closed - Won" /
-- "Closed - Lost" (the two outcomes every deal eventually reaches) stay
-- protected: they can be renamed, but not deleted, so conversion rate,
-- follow-up alerts, and velocity reporting always know what "closed" means.
--
-- This is purely additive/preserving: every existing lead keeps its exact
-- current stage, just represented as a stable text key (e.g. 'closed_won')
-- instead of an enum value ('Closed - Won'). Any label an admin already
-- customized via status_labels is carried forward before that table is
-- dropped.

create table public.pipeline_stages (
  key text primary key,
  label text not null,
  color text not null default '#7A8B84',
  sort_order integer not null,
  is_protected boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.pipeline_stages enable row level security;

create policy "pipeline_stages_select_authenticated"
  on public.pipeline_stages for select
  to authenticated
  using (true);

create policy "pipeline_stages_admin_write"
  on public.pipeline_stages for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Block deleting the three protected anchor stages even for admins, since
-- reporting logic (CLOSED_STATUS_KEYS in application code) hard-depends on
-- new_lead/closed_won/closed_lost always existing.
create function public.prevent_protected_stage_delete()
returns trigger
language plpgsql
as $$
begin
  if old.is_protected then
    raise exception 'Cannot delete a protected pipeline stage (%).', old.key;
  end if;
  return old;
end;
$$;

create trigger pipeline_stages_protect_delete
  before delete on public.pipeline_stages
  for each row
  execute function public.prevent_protected_stage_delete();

insert into public.pipeline_stages (key, label, color, sort_order, is_protected) values
  ('new_lead', 'New Lead', '#BED2EC', 1, true),
  ('contacted', 'Contacted', '#9FBDE3', 2, false),
  ('qualified', 'Qualified', '#81A9DA', 3, false),
  ('viewing_scheduled', 'Viewing Scheduled', '#6294D1', 4, false),
  ('negotiating', 'Negotiating', '#447FC8', 5, false),
  ('offer_made', 'Offer Made', '#256ABF', 6, false),
  ('closed_won', 'Closed - Won', '#C9A24B', 7, true),
  ('closed_lost', 'Closed - Lost', '#CD5C5C', 8, true),
  ('on_hold', 'On Hold', '#909A93', 9, false);

-- Carry forward any labels already customized via Settings > Status labels.
update public.pipeline_stages ps
set label = sl.label
from public.status_labels sl
where sl.status::text = case ps.key
  when 'new_lead' then 'New Lead'
  when 'contacted' then 'Contacted'
  when 'qualified' then 'Qualified'
  when 'viewing_scheduled' then 'Viewing Scheduled'
  when 'negotiating' then 'Negotiating'
  when 'offer_made' then 'Offer Made'
  when 'closed_won' then 'Closed - Won'
  when 'closed_lost' then 'Closed - Lost'
  when 'on_hold' then 'On Hold'
end;

-- Convert leads.status from the enum to the new stable text key, preserving
-- every lead's current stage exactly.
alter table public.leads alter column status drop default;
alter table public.leads alter column status type text using (
  case status::text
    when 'New Lead' then 'new_lead'
    when 'Contacted' then 'contacted'
    when 'Qualified' then 'qualified'
    when 'Viewing Scheduled' then 'viewing_scheduled'
    when 'Negotiating' then 'negotiating'
    when 'Offer Made' then 'offer_made'
    when 'Closed - Won' then 'closed_won'
    when 'Closed - Lost' then 'closed_lost'
    when 'On Hold' then 'on_hold'
  end
);
alter table public.leads alter column status set default 'new_lead';
alter table public.leads alter column status set not null;
alter table public.leads
  add constraint leads_status_fkey foreign key (status) references public.pipeline_stages (key);

drop table public.status_labels;
drop type public.lead_status;
