-- Ivy Group CRM — Property Type becomes Project, with a wired-in location
--
-- "Property type" now represents an actual named development (Ivy Park, Ivy
-- Myst, ...) rather than a category like "Apartment"/"Villa". Each project
-- has one fixed location, which the lead form auto-fills when a project is
-- selected. Existing categorical rows are left in place (admins can rename,
-- add a location to, or delete them from Settings) rather than deleted here,
-- since real leads may already reference them.

alter table public.property_types add column if not exists location text;

insert into public.property_types (name, location) values
  ('Ivy Park', 'Kilimani'),
  ('Ivy Myst', 'Kileleshwa'),
  ('Blossoms Ivy', 'Kileleshwa'),
  ('Luckinn Ivy', 'Westlands')
on conflict (name) do update set location = excluded.location;
