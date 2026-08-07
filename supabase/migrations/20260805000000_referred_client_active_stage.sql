-- Ivy Group CRM — dedicated stage for "referral handed off to a client record"
--
-- The agent/client dedup review tool (Reports > Referrers) used to move a
-- resolved agent to "On Hold" — but that implies paused/stalled, which is
-- wrong: the agent didn't stall, they successfully referred a client and the
-- deal is now progressing on that client's own record. This stage says that
-- accurately instead.

insert into public.pipeline_stages (key, label, color, sort_order, is_protected)
select 'referred_client_active', 'Referred — Client Active', '#3FA3A0', coalesce(max(sort_order), 0) + 1, false
from public.pipeline_stages
on conflict (key) do nothing;
