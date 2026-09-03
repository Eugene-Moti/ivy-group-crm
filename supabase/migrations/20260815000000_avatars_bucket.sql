-- Ivy Group CRM — profile photo storage
--
-- profiles.avatar_url has existed since the initial schema but nothing has
-- ever written to it — every avatar in the app is still just colored
-- initials. This adds the storage side: a public bucket (a profile photo
-- isn't sensitive the way a contract or ID copy is, so no signed-URL
-- plumbing needed) keyed by folder-per-user, so a person can replace their
-- own photo and an admin can replace anyone's — the same self-or-admin
-- shape already used for display_name/job_title on profiles itself.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_files_select_public"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "avatars_files_self_or_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "avatars_files_self_or_admin_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  )
  with check (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy "avatars_files_self_or_admin_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );
