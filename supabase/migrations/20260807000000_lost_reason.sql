-- Ivy Group CRM — capture why a lead was lost
--
-- Previously a lead moving to "Closed - Lost" was just a status change with
-- no structured reason — no way to see patterns (which sources/projects
-- lose the most, and why). These columns are nullable (existing lost leads
-- won't retroactively have a reason) and only populated going forward, via
-- the lead form and the Kanban board.

alter table public.leads add column if not exists lost_reason text;
alter table public.leads add column if not exists lost_reason_note text;

alter table public.leads add constraint leads_lost_reason_check check (
  lost_reason is null or lost_reason in (
    'Budget mismatch',
    'Chose a competitor',
    'Unresponsive',
    'Changed mind',
    'Financing fell through',
    'Other'
  )
);
