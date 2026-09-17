-- Ivy Group CRM — a place for admins to teach Orion about the business
--
-- Orion asked (in a real conversation) several things only the team can
-- answer: who Michael Olanya actually is (sales manager vs. WhatsApp
-- intake), what "Negotiating" means in practice vs. "Offer Made", the
-- normal follow-up cadence for a Warm lead, whether budget is expected to
-- be captured early or left for the offer stage. Rather than hardcoding
-- one team's answers into Orion's prompt (which goes stale and doesn't
-- generalize), admins write the answers once here in plain English, and
-- every Orion surface (chat, Portfolio Briefing, daily digest) includes it
-- verbatim as grounding context.
--
-- Singleton table: exactly one row, enforced by the boolean primary key
-- trick (id can only ever be `true`).

create table public.orion_business_context (
  id boolean primary key default true check (id),
  content text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.orion_business_context (id, content) values (true, '');

create trigger orion_business_context_set_updated_at
  before update on public.orion_business_context
  for each row execute function public.set_updated_at();

alter table public.orion_business_context enable row level security;

create policy "orion_business_context_select_authenticated" on public.orion_business_context
  for select to authenticated using (true);

create policy "orion_business_context_admin_write" on public.orion_business_context
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
