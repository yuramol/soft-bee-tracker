-- migration: avatars storage bucket
-- purpose: let users upload a profile photo from their device instead of pasting a url.
-- affected objects: storage.buckets row 'avatars'; rls policies on storage.objects
--   scoped to bucket_id = 'avatars'
-- special risks: the bucket is public, so anyone with an object url can view the image.
--   that matches how avatars are shown across the app; writes stay limited to the
--   owner's own folder ("<auth.uid()>/...").

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do nothing;

-- storage.objects is shared by every bucket, so the secure-session guard is scoped
-- to avatars and leaves other (future) buckets to their own policies
create policy "avatars require secure session"
  on storage.objects
  as restrictive
  for all
  to authenticated
  using (bucket_id <> 'avatars' or (select private.is_secure()))
  with check (bucket_id <> 'avatars' or (select private.is_secure()));

-- each user owns the folder named after their id; the first path segment is that folder
create policy "avatars_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
