-- Ivy Group CRM — an agent's own card can never be "Closed - Won"
--
-- A Real Estate Agent lead is a referral source, not the client — a
-- completed sale belongs on the client lead created via "Add client
-- details", never on the agent's own card. Without this, marking the
-- agent's card Won directly (instead of converting the referral) silently
-- undercounts every conversion/performance number in the system, since all
-- of them exclude Real Estate Agent leads by design, AND leaves no client
-- record (name, phone, email, budget, evidence) for whoever actually bought.
--
-- Enforced at the UI layer already (Kanban, the lead form, the AI
-- Assistant's propose_status_change tool) — this is the backstop nothing
-- can slip past, including future code that forgets the rule.
--
-- NOT VALID: some leads may already violate this today (that's the whole
-- reason this migration exists) — this only blocks it going forward,
-- without failing on data that already needs fixing. Find those via
-- Reports > Agent Won audit, then for each one: click "Add client details"
-- to create the real client lead, mark THAT one Won, and correct the
-- agent's own card back to a real status (e.g. "Referred - Client Active").

alter table public.leads
  add constraint leads_agent_not_closed_won
  check (not (lead_type = 'Real Estate Agent' and status = 'closed_won'))
  not valid;
