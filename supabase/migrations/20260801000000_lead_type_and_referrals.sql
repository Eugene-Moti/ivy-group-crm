-- Ivy Group CRM — distinguish real estate agent leads from direct buyer leads
--
-- Some inbound leads turn out to be real estate agents bringing their own
-- clients rather than direct buyers. They're still tracked as leads — same
-- pipeline, same stages, can still close — just tagged with a type. When the
-- referring agent happens to be known, a buyer lead can optionally point
-- back to the agent lead that brought them in. Agents commonly don't
-- disclose their client's details, so this link is optional/best-effort,
-- never required.

create type public.lead_type as enum ('Direct Client', 'Real Estate Agent');

alter table public.leads
  add column lead_type public.lead_type not null default 'Direct Client',
  add column referred_by_lead_id uuid references public.leads (id) on delete set null;

alter table public.leads
  add constraint leads_referred_by_not_self check (referred_by_lead_id is distinct from id);

create index leads_lead_type_idx on public.leads (lead_type);
create index leads_referred_by_lead_id_idx on public.leads (referred_by_lead_id);
