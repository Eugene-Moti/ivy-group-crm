-- Ivy Group CRM — allow deleting a user profile (Phase 10.1: Settings user management)
--
-- The original foreign keys from leads.assigned_to and activities/saved_queries
-- .created_by to profiles had no ON DELETE action, so Postgres defaults to
-- NO ACTION — deleting a user who has assigned leads or authored
-- activities/saved queries would fail with a foreign key violation. Switch
-- these to SET NULL: removing a user unassigns their leads and anonymizes
-- their activity/query authorship instead of blocking the deletion.

alter table public.leads
  drop constraint leads_assigned_to_fkey,
  add constraint leads_assigned_to_fkey
    foreign key (assigned_to) references public.profiles (id) on delete set null;

alter table public.activities
  drop constraint activities_created_by_fkey,
  add constraint activities_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.saved_queries
  drop constraint saved_queries_created_by_fkey,
  add constraint saved_queries_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null;
