-- Ivy Group CRM — lost reasons split by lead type
--
-- A client's deal falling through and an agent's referral relationship
-- going cold are different failure modes — the original single reason list
-- ("Budget mismatch", "Financing fell through", ...) never fit an agent.
-- Replaces the flat CHECK constraint with a lead_type-aware one.
--
-- Order matters here: drop the old constraint first, then normalize any
-- agent lead that was already Closed - Lost (it could only ever have been
-- given a reason from the old client list, since that was the only list
-- that existed) onto the new agent list, THEN add the new constraint —
-- otherwise those rows can't be re-saved from the lead form afterward.
-- "Unresponsive" is the one clean mapping; anything else an agent somehow
-- ended up with becomes "Other".

alter table public.leads drop constraint if exists leads_lost_reason_check;

update public.leads
set lost_reason = case
  when lost_reason = 'Unresponsive' then 'Went unresponsive'
  else 'Other'
end
where lead_type = 'Real Estate Agent'
  and lost_reason is not null
  and lost_reason not in (
    'Went unresponsive', 'Partnered with a competing agency', 'No referrals materialized', 'Other'
  );

alter table public.leads
  add constraint leads_lost_reason_check
  check (
    lost_reason is null
    or (
      lead_type = 'Real Estate Agent'
      and lost_reason in ('Went unresponsive', 'Partnered with a competing agency', 'No referrals materialized', 'Other')
    )
    or (
      lead_type <> 'Real Estate Agent'
      and lost_reason in ('Budget mismatch', 'Chose a competitor', 'Unresponsive', 'Changed mind', 'Financing fell through', 'Other')
    )
  )
  not valid;
