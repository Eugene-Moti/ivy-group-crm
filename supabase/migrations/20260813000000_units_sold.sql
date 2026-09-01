-- Ivy Group CRM — units sold, replacing the old deal_value/commission fields
--
-- The marketing team's commission structure turned out to be genuinely
-- different from the first-pass "deal value + generic commission" fields
-- added in 20260812000000: a direct client sale earns 1% of the unit
-- amount, but a sale that came through a referring agent earns a separate,
-- manually-set bonus with no fixed formula. Units are also naturally
-- separate from leads — one client can buy more than one unit — so this is
-- its own table rather than more columns on `leads`.
--
-- Every unit sold must reference a real lead (client name, sales manager,
-- and — if it was an agent referral — the referring agent are all derived
-- by joining back to that lead rather than duplicated here, so there's one
-- place this data can drift out of sync: nowhere).
--
-- sale_type is derived from the lead's referred_by_lead_id at the moment a
-- unit is recorded (an agent-referred lead can only ever be an "Agent
-- Referral" sale) and stored rather than joined on every report query.

create table public.units_sold (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete restrict,
  unit_number text not null,
  unit_size text,
  sale_type text not null check (sale_type in ('Direct Client', 'Agent Referral')),
  unit_amount numeric not null check (unit_amount >= 0),
  bonus_amount numeric not null default 0 check (bonus_amount >= 0),
  bonus_paid boolean not null default false,
  sold_at date not null default current_date,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.units_sold enable row level security;

create policy "units_sold_select_authenticated"
  on public.units_sold for select
  to authenticated
  using (true);

create policy "units_sold_admin_write"
  on public.units_sold for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create index units_sold_lead_id_idx on public.units_sold (lead_id);
create index units_sold_unit_number_idx on public.units_sold (unit_number);

-- Retire the old lead-level commission fields — Units Sold is now the one
-- place this data lives. Existing values are lost; there were never any
-- reports or automation reading them beyond what this migration replaces.
alter table public.leads
  drop constraint if exists leads_deal_value_nonneg,
  drop constraint if exists leads_commission_amount_nonneg,
  drop constraint if exists leads_referral_fee_amount_nonneg;

alter table public.leads
  drop column if exists deal_value,
  drop column if exists commission_amount,
  drop column if exists referral_fee_amount,
  drop column if exists referral_fee_paid;
