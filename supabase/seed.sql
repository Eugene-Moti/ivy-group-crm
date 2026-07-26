-- Ivy Group CRM — seed data
-- Run after the initial migration. Safe to re-run against an empty leads table;
-- re-running against a populated one will fail on the lead_sources unique
-- constraint (truncate leads, activities, campaigns, lead_sources first if needed).

-- ============================================================================
-- Lead sources
-- ============================================================================

insert into public.lead_sources (name) values
  ('Website'),
  ('Facebook Ad'),
  ('Instagram'),
  ('Google Ad'),
  ('WhatsApp'),
  ('Referral'),
  ('Walk-in'),
  ('Open House'),
  ('Property Portal'),
  ('Email Campaign'),
  ('Cold Call'),
  ('Event / Expo');

-- ============================================================================
-- Campaigns
-- ============================================================================

insert into public.campaigns (name, lead_source_id, channel) values
  ('Kilimani Skyline Launch', (select id from public.lead_sources where name = 'Facebook Ad'), 'Facebook'),
  ('Karen Villas Q3', (select id from public.lead_sources where name = 'Instagram'), 'Instagram'),
  ('Westlands Apartments Push', (select id from public.lead_sources where name = 'Google Ad'), 'Google Search'),
  ('Off-Plan Newsletter', (select id from public.lead_sources where name = 'Email Campaign'), 'Email');

-- ============================================================================
-- Leads
-- ============================================================================

insert into public.leads (
  first_name, last_name, phone, email, lead_source_id, campaign_id,
  priority, status, property_type, preferred_area, budget_min, budget_max,
  bedrooms, last_contact_at, next_follow_up_at, notes, created_at
) values
  (
    'Jane', 'Wanjiru', '+254712345001', 'jane.wanjiru@example.com',
    (select id from public.lead_sources where name = 'Website'), null,
    'Hot', 'New Lead', 'Apartment', 'Kilimani', 8000000, 12000000,
    2, now() - interval '1 day', now() + interval '2 days',
    'Found us via the website contact form, wants a move-in-ready 2-bed.',
    now() - interval '2 days'
  ),
  (
    'Brian', 'Otieno', '+254712345002', 'brian.otieno@example.com',
    (select id from public.lead_sources where name = 'Facebook Ad'),
    (select id from public.campaigns where name = 'Kilimani Skyline Launch'),
    'Warm', 'Contacted', 'Maisonette', 'Kileleshwa', 15000000, 20000000,
    4, now() - interval '4 days', now() - interval '3 days',
    'Relocating from Mombasa, needs a 4-bed maisonette with a garden.',
    now() - interval '10 days'
  ),
  (
    'Grace', 'Muthoni', '+254712345003', 'grace.muthoni@example.com',
    (select id from public.lead_sources where name = 'Referral'), null,
    'Warm', 'Qualified', 'Townhouse', 'Syokimau', 6000000, 9000000,
    3, now() - interval '2 days', date_trunc('day', now()) + interval '14 hours',
    'Referred by an existing client, pre-approved for a mortgage.',
    now() - interval '18 days'
  ),
  (
    'David', 'Kamau', '+254712345004', 'david.kamau@example.com',
    (select id from public.lead_sources where name = 'Instagram'),
    (select id from public.campaigns where name = 'Karen Villas Q3'),
    'Hot', 'Viewing Scheduled', 'Villa', 'Karen', 35000000, 50000000,
    5, now() - interval '1 day', now() + interval '1 day',
    'Viewing scheduled for the Karen villa listing, cash buyer.',
    now() - interval '25 days'
  ),
  (
    'Amina', 'Hassan', '+254712345005', 'amina.hassan@example.com',
    (select id from public.lead_sources where name = 'Google Ad'),
    (select id from public.campaigns where name = 'Westlands Apartments Push'),
    'Cold', 'Negotiating', 'Apartment', 'Westlands', 10000000, 14000000,
    2, now() - interval '5 days', now() - interval '1 day',
    'Negotiating on price, wants a 10% discount off asking.',
    now() - interval '35 days'
  ),
  (
    'Peter', 'Njoroge', '+254712345006', 'peter.njoroge@example.com',
    (select id from public.lead_sources where name = 'Property Portal'), null,
    'Warm', 'Offer Made', 'Off-Plan', 'Kilimani', 7000000, 11000000,
    3, now() - interval '3 days', now() + interval '5 days',
    'Offer submitted for an off-plan unit, awaiting developer response.',
    now() - interval '48 days'
  ),
  (
    'Faith', 'Wambui', '+254712345007', 'faith.wambui@example.com',
    (select id from public.lead_sources where name = 'WhatsApp'), null,
    'Hot', 'Closed - Won', 'Apartment', 'Kileleshwa', 9000000, 13000000,
    2, now() - interval '6 days', null,
    'Sale closed — 2-bed apartment in Kileleshwa.',
    now() - interval '60 days'
  ),
  (
    'Samuel', 'Kiptoo', '+254712345008', 'samuel.kiptoo@example.com',
    (select id from public.lead_sources where name = 'Walk-in'), null,
    'Cold', 'Closed - Lost', 'Land / Plot', 'Ruaka', 3000000, 5000000,
    null, now() - interval '20 days', null,
    'Went with a competing agency offering a lower price per acre.',
    now() - interval '75 days'
  );

-- ============================================================================
-- Activities
-- ============================================================================

insert into public.activities (lead_id, type, body, created_at)
select id, 'note', 'Lead captured from the website contact form.', created_at + interval '1 hour'
from public.leads where email = 'jane.wanjiru@example.com';
insert into public.activities (lead_id, type, body, created_at)
select id, 'email', 'Sent a welcome email with a shortlist of Kilimani listings.', created_at + interval '1 day'
from public.leads where email = 'jane.wanjiru@example.com';

insert into public.activities (lead_id, type, body, created_at)
select id, 'call', 'Initial call — confirmed budget and desired move-in date.', created_at + interval '2 days'
from public.leads where email = 'brian.otieno@example.com';
insert into public.activities (lead_id, type, body, created_at)
select id, 'status_change', 'Status changed from New Lead to Contacted.', created_at + interval '2 days'
from public.leads where email = 'brian.otieno@example.com';

insert into public.activities (lead_id, type, body, created_at)
select id, 'whatsapp', 'Shared mortgage pre-approval checklist over WhatsApp.', created_at + interval '3 days'
from public.leads where email = 'grace.muthoni@example.com';
insert into public.activities (lead_id, type, body, created_at)
select id, 'status_change', 'Status changed from Contacted to Qualified.', created_at + interval '4 days'
from public.leads where email = 'grace.muthoni@example.com';

insert into public.activities (lead_id, type, body, created_at)
select id, 'viewing', 'Scheduled a viewing at the Karen villa for this weekend.', created_at + interval '5 days'
from public.leads where email = 'david.kamau@example.com';
insert into public.activities (lead_id, type, body, created_at)
select id, 'call', 'Confirmed viewing time and directions.', created_at + interval '6 days'
from public.leads where email = 'david.kamau@example.com';

insert into public.activities (lead_id, type, body, created_at)
select id, 'note', 'Client requested a 10% discount before proceeding.', created_at + interval '6 days'
from public.leads where email = 'amina.hassan@example.com';
insert into public.activities (lead_id, type, body, created_at)
select id, 'status_change', 'Status changed from Viewing Scheduled to Negotiating.', created_at + interval '7 days'
from public.leads where email = 'amina.hassan@example.com';

insert into public.activities (lead_id, type, body, created_at)
select id, 'email', 'Submitted a formal offer letter to the developer.', created_at + interval '8 days'
from public.leads where email = 'peter.njoroge@example.com';
insert into public.activities (lead_id, type, body, created_at)
select id, 'status_change', 'Status changed from Negotiating to Offer Made.', created_at + interval '8 days'
from public.leads where email = 'peter.njoroge@example.com';

insert into public.activities (lead_id, type, body, created_at)
select id, 'note', 'Signed sale agreement, deposit received.', created_at + interval '10 days'
from public.leads where email = 'faith.wambui@example.com';
insert into public.activities (lead_id, type, body, created_at)
select id, 'status_change', 'Status changed from Offer Made to Closed - Won.', created_at + interval '12 days'
from public.leads where email = 'faith.wambui@example.com';

insert into public.activities (lead_id, type, body, created_at)
select id, 'call', 'Client informed us they signed with a competing agency.', created_at + interval '15 days'
from public.leads where email = 'samuel.kiptoo@example.com';
insert into public.activities (lead_id, type, body, created_at)
select id, 'status_change', 'Status changed from Negotiating to Closed - Lost.', created_at + interval '15 days'
from public.leads where email = 'samuel.kiptoo@example.com';
