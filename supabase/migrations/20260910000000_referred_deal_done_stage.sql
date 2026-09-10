-- Ivy Group CRM — a terminal stage for agents whose referral converted
--
-- Depends on 20260805000000_referred_client_active_stage.sql (the
-- 'referred_client_active' stage) and 20260806000000_auto_resolve_referring_agent.sql.
--
-- An agent who refers a buyer gets parked at "Referred — Client Active"
-- while that buyer works through the pipeline. Nothing moved them once the
-- buyer's deal closed Won — they'd sit at "Client Active" forever, which
-- reads wrong (the client isn't active anymore, and the marketing team's
-- Agent Referral bonus has been earned). Agents can't go to Closed - Won
-- themselves (leads_agent_not_closed_won), so they need their own terminal
-- success stage. This adds it and wires the transition both ways.

insert into public.pipeline_stages (key, label, color, sort_order, is_protected)
select 'referred_deal_done', 'Referred — Deal Done', '#2E7D6B', coalesce(max(sort_order), 0) + 1, false
from public.pipeline_stages
on conflict (key) do nothing;

-- Fires on the *client's* status, not the agent's, so it's a separate
-- trigger from auto_resolve_referring_agent (which fires on the referral
-- link being established). Deliberately only advances an agent who's still
-- sitting at 'referred_client_active' — if an admin has since moved them
-- somewhere by hand, that manual choice is left alone, same principle as
-- the existing trigger.
create or replace function public.sync_referring_agent_on_client_close()
returns trigger
language plpgsql
as $$
declare
  agent_id uuid := new.referred_by_lead_id;
begin
  if agent_id is null then
    return new;
  end if;

  -- Referred client landed on Closed - Won (or was created there): advance
  -- the agent to "Referred — Deal Done", but only once this was their last
  -- still-open referred client. An agent with other referrals still in the
  -- pipeline stays at "Referred — Client Active".
  if new.status = 'closed_won'
     and (tg_op = 'INSERT' or old.status is distinct from 'closed_won') then
    update public.leads a
    set status = 'referred_deal_done'
    where a.id = agent_id
      and a.lead_type = 'Real Estate Agent'
      and a.status = 'referred_client_active'
      and not exists (
        select 1 from public.leads c
        where c.referred_by_lead_id = agent_id
          and c.id <> new.id
          and c.status not in ('closed_won', 'closed_lost')
      );
  end if;

  -- Symmetric: a previously-won referred client is reopened into the live
  -- pipeline. If the agent was parked at "Referred — Deal Done" on the
  -- strength of that deal, pull them back to "Referred — Client Active".
  if tg_op = 'UPDATE'
     and old.status = 'closed_won'
     and new.status not in ('closed_won', 'closed_lost') then
    update public.leads a
    set status = 'referred_client_active'
    where a.id = agent_id
      and a.lead_type = 'Real Estate Agent'
      and a.status = 'referred_deal_done';
  end if;

  return new;
end;
$$;

create trigger leads_sync_referring_agent_on_client_close
  after insert or update of status on public.leads
  for each row
  execute function public.sync_referring_agent_on_client_close();
