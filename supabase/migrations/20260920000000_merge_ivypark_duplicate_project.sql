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
--
-- Reports each step's row count via RAISE NOTICE — check the SQL Editor's
-- output/logs panel after running, not just "Success, no rows returned".

do $$
declare
  canonical_id uuid;
  duplicate_count int;
  repointed_count int;
  deleted_count int;
begin
  select count(*) into duplicate_count
  from public.property_types
  where regexp_replace(lower(name), '\s+', '', 'g') = 'ivypark';

  raise notice 'Matching rows found: %', duplicate_count;

  if duplicate_count = 0 then
    raise notice 'Nothing matches "Ivy Park" / "Ivypark" — nothing to do.';
    return;
  end if;

  select pt.id into canonical_id
  from public.property_types pt
  where regexp_replace(lower(pt.name), '\s+', '', 'g') = 'ivypark'
  order by (select count(*) from public.leads l where l.property_type_id = pt.id) desc, pt.created_at asc
  limit 1;

  raise notice 'Canonical row chosen: %', canonical_id;

  update public.leads
  set property_type_id = canonical_id
  where property_type_id in (
    select id from public.property_types
    where regexp_replace(lower(name), '\s+', '', 'g') = 'ivypark' and id <> canonical_id
  );
  get diagnostics repointed_count = row_count;
  raise notice 'Leads repointed: %', repointed_count;

  delete from public.property_types
  where regexp_replace(lower(name), '\s+', '', 'g') = 'ivypark' and id <> canonical_id;
  get diagnostics deleted_count = row_count;
  raise notice 'Duplicate rows deleted: %', deleted_count;

  update public.property_types
  set name = 'Ivypark - Kilimani', location = 'Kilimani'
  where id = canonical_id;

  raise notice 'Canonical row renamed to "Ivypark - Kilimani". Done.';
end $$;
