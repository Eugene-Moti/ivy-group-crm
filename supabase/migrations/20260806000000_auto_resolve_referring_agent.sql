-- Ivy Group CRM — auto-resolve an agent when a referral is confirmed
--
-- Depends on 20260805000000_referred_client_active_stage.sql already having
-- run (needs the 'referred_client_active' pipeline stage to exist).
--
-- The Referrers review panel (Reports > Referrers) only resolves a
-- dual-active agent/client pair when an admin manually clicks "Mark
-- referral as resolved" — nothing established the link and fixed it in one
-- step. This trigger does that automatically: the moment any lead is
-- inserted (or has its "Referred by agent" newly set) while pointing at an
-- open, active client, the referenced agent is moved to "Referred — Client
-- Active" — unless they're already there or already closed.
--
-- Deliberately only fires when the link is NEWLY established (insert, or
-- referred_by_lead_id actually changing) — not on every later status change
-- of the client — so once set, an admin can freely move the agent
-- elsewhere afterward without this silently reverting it. An agent who
-- refers a second or third client over time needs nothing extra: the first
-- confirmed referral already moved them, and this trigger no-ops on
-- subsequent ones since they're already at the resolved stage.

create function public.auto_resolve_referring_agent()
returns trigger
language plpgsql
as $$
begin
  update public.leads
  set status = 'referred_client_active'
  where id = new.referred_by_lead_id
    and lead_type = 'Real Estate Agent'
    and status not in ('closed_won', 'closed_lost', 'referred_client_active');
  return new;
end;
$$;

create trigger leads_auto_resolve_referring_agent
  after insert or update of referred_by_lead_id on public.leads
  for each row
  when (
    new.referred_by_lead_id is not null
    and new.status not in ('closed_won', 'closed_lost')
    and (tg_op = 'INSERT' or old.referred_by_lead_id is distinct from new.referred_by_lead_id)
  )
  execute function public.auto_resolve_referring_agent();
