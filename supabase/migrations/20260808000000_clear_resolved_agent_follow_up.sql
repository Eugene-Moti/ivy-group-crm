-- Ivy Group CRM — a resolved agent shouldn't keep a stale follow-up date
--
-- Once an agent auto-resolves to "Referred — Client Active", their own card
-- isn't the active tracking record for a deal anymore — the referred client's
-- is. But their next_follow_up_at (set back when their card WAS the active
-- deal) was left untouched, so both the agent and the client kept showing up
-- in Follow-ups and the notification bell for what's really one deal.
--
-- One-time backfill for agents already resolved, plus an update to the
-- auto-resolve trigger (from 20260806000000_auto_resolve_referring_agent.sql)
-- so this doesn't happen for future ones.

update public.leads
set next_follow_up_at = null
where status = 'referred_client_active' and next_follow_up_at is not null;

create or replace function public.auto_resolve_referring_agent()
returns trigger
language plpgsql
as $$
begin
  if new.referred_by_lead_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.referred_by_lead_id is not distinct from new.referred_by_lead_id then
    return new;
  end if;

  if new.status in ('closed_won', 'closed_lost') then
    return new;
  end if;

  update public.leads
  set status = 'referred_client_active',
      next_follow_up_at = null
  where id = new.referred_by_lead_id
    and lead_type = 'Real Estate Agent'
    and status not in ('closed_won', 'closed_lost', 'referred_client_active');

  return new;
end;
$$;
