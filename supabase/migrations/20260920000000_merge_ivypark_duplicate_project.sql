-- Ivy Group CRM — merge the duplicate "Ivy Park" / "Ivypark" project
--
-- Orion flagged this while reviewing the pipeline: "Ivy Park" (55 leads)
-- and "Ivypark" (1 lead) are separate property_types rows for what's
-- clearly the same project, split by an inconsistent spelling — a phantom
-- project inflating by_project breakdowns. The team confirmed: merge them
-- into one row named "Ivypark - Kilimani".
--
-- Matches case-/whitespace-insensitively (so "Ivy Park", "IvyPark", "ivy
-- park" all collapse to the same row) rather than an exact string, since
-- that's the actual shape of the duplication. Keeps whichever matching row
-- already has the most leads as the canonical id — less data to move —
-- repoints every lead on any other matching row to it, deletes the
-- now-empty duplicates, then renames the canonical row.

do $$
declare
  canonical_id uuid;
begin
  select pt.id into canonical_id
  from public.property_types pt
  where regexp_replace(lower(pt.name), '\s+', '', 'g') = 'ivypark'
  order by (select count(*) from public.leads l where l.property_type_id = pt.id) desc, pt.created_at asc
  limit 1;

  if canonical_id is null then
    raise notice 'No "Ivy Park" / "Ivypark" project rows found — nothing to merge.';
    return;
  end if;

  update public.leads
  set property_type_id = canonical_id
  where property_type_id in (
    select id from public.property_types
    where regexp_replace(lower(name), '\s+', '', 'g') = 'ivypark' and id <> canonical_id
  );

  delete from public.property_types
  where regexp_replace(lower(name), '\s+', '', 'g') = 'ivypark' and id <> canonical_id;

  update public.property_types
  set name = 'Ivypark - Kilimani', location = 'Kilimani'
  where id = canonical_id;

  raise notice 'Merged into property_types.id = %', canonical_id;
end $$;
