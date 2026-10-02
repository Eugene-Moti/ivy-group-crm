-- Ivy Group CRM — link a repeat client's new inquiry to their earlier lead
--
-- A client who already bought one unit sometimes comes back wanting a
-- different project entirely — different budget, needs to go through the
-- Kanban pipeline again from scratch. That has to be a genuinely new lead
-- (its own stage progression, its own budget, its own follow-ups), but
-- creating one with the same phone/email trips the possible-duplicates
-- detector, which exists to catch accidental double-entry and agent
-- ownership conflicts — not a legitimate returning customer.
--
-- repeat_of_lead_id lets an admin explicitly say "this new lead is the
-- same person as that earlier one" (same self-referencing pattern as
-- referred_by_lead_id). Once linked, the pair is excluded from the
-- duplicate-detector's clusters, and each lead's page cross-links to the
-- other so the sales team sees the full relationship instead of two
-- disconnected cards.

alter table public.leads
  add column repeat_of_lead_id uuid references public.leads (id) on delete set null;

create index leads_repeat_of_lead_id_idx on public.leads (repeat_of_lead_id);
