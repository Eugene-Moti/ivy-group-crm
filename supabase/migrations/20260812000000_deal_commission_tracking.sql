-- Ivy Group CRM — deal value and commission tracking
--
-- budget_min/budget_max capture what a client was looking to spend going
-- in; nothing captured what a deal actually closed at, or what the agency
-- earned, or what's owed to a referring agent. That's a real revenue-
-- reporting gap, not just a lead-conversion one.
--
-- All nullable and not required to mark a lead Won — the paperwork on the
-- exact numbers can lag the status change, and forcing it would just block
-- people from recording a win they're sure of. The Revenue report and a
-- notification-bell nudge (Won leads missing deal value) are the backstop
-- for filling these in, same pattern as the Agent Won audit.

alter table public.leads
  add column deal_value numeric,
  add column commission_amount numeric,
  add column referral_fee_amount numeric,
  add column referral_fee_paid boolean not null default false;

alter table public.leads
  add constraint leads_deal_value_nonneg check (deal_value is null or deal_value >= 0),
  add constraint leads_commission_amount_nonneg check (commission_amount is null or commission_amount >= 0),
  add constraint leads_referral_fee_amount_nonneg check (referral_fee_amount is null or referral_fee_amount >= 0);
