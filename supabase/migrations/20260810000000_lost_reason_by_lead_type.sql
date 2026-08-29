-- Ivy Group CRM — lost reasons split by lead type
--
-- A client's deal falling through and an agent's referral relationship
-- going cold are different failure modes — the original single reason list
-- ("Budget mismatch", "Financing fell through", ...) never fit an agent.
-- Replaces the flat CHECK constraint with a lead_type-aware one.
--
-- NOT VALID: any agent lead already Closed - Lost today was necessarily
-- given a reason from the old client-oriented list (it was the only list
-- that existed), which won't satisfy the new agent branch below. This
-- doesn't fail the migration on that — it just means those specific rows
-- are worth a quick look afterward (Reports, or just open the lead) to
-- reassign a reason from the new agent list if you want one that fits.

alter table public.leads drop constraint if exists leads_lost_reason_check;

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
