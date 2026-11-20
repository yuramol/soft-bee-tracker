-- migration: tracker review (approve / reject time entries)
-- purpose: let managers and admins approve or reject staff time entries, record who
--   reviewed an entry and when, and make the database (not only the ui) enforce the
--   review rules. until now the trackers update policy let a project manager set any
--   status on any row, including their own, with any other change in the same write.
-- affected objects: columns public.trackers.reviewed_by, reviewed_at, review_note;
--   index trackers_reviewed_by_idx; check trackers_review_note_length_check;
--   functions private.user_role_of(uuid), private.guard_tracker_review();
--   trigger guard_tracker_review on public.trackers
-- rules (enforced for every request with a user; service role and sql sessions are trusted):
--   - new entries always start as 'new' with no review data.
--   - status moves only new -> approved | rejected, or back approved | rejected -> new (undo).
--   - only managers and admins change status. managers never review their own entries or
--     an admin's entries; admins review any entry, their own included. which projects a
--     manager may touch is still decided by the trackers update rls policy.
--   - a reviewed (approved or rejected) entry cannot be edited or deleted, by anyone, until
--     the review is undone. otherwise a manager could change, or delete and re-log, their own
--     admin-approved entry.
--   - a status change cannot carry other edits, and a running or paused timer cannot be
--     approved or rejected.
--   - rejecting needs a reason of at most 500 characters. reviewed_by / reviewed_at always
--     come from the trigger (caller and now()), so clients cannot forge them; undo clears them.
--   - every refusal carries a stable key in the error hint ('tracker_review.<reason>'); the
--     app maps those keys, not the message text, to what the user sees.
-- special risks:
--   - alter table adds nullable columns and a check that every existing row passes (no
--     existing row has a review_note); existing rows keep their status and get null review
--     data. no policy or grant changes on public.trackers.
--   - authenticated inserts with a status other than 'new' now fail (no app path does this).
--   - managers and admins can no longer correct or delete an approved or rejected entry in
--     place; they undo the review first. this also applies to staff deleting their entries.
--   - only the latest review is stored on the row.

-- safety: additive only. new nullable columns, no defaults to backfill, no rewrite of
-- existing data; the fk uses on delete set null so removing a user never removes time
alter table public.trackers
  add column reviewed_by uuid references public.users (id) on delete set null,
  add column reviewed_at timestamptz,
  add column review_note text;

-- safety: every existing row has review_note null, so the check validates without failures
alter table public.trackers
  add constraint trackers_review_note_length_check
  check (review_note is null or pg_catalog.char_length(review_note) <= 500);

-- fk lookups and on delete set null from public.users
create index trackers_reviewed_by_idx on public.trackers (reviewed_by);

comment on column public.trackers.reviewed_by is 'user who last approved or rejected the entry; set by trigger';
comment on column public.trackers.reviewed_at is 'when the entry was last approved or rejected; set by trigger';
comment on column public.trackers.review_note is 'reason given when the entry was rejected; set only with status rejected';

-- security definer justification: the review trigger runs as the caller and must know the
-- entry owner's role. reading public.user_access through the caller's rls would make every
-- manager review fail with a misleading "only an admin" error if that table's select policy
-- is ever narrowed. it returns only the role, never other access columns.
create or replace function private.user_role_of(target_user_id uuid)
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select ua.role
  from public.user_access ua
  where ua.user_id = target_user_id;
$$;

comment on function private.user_role_of(uuid) is 'role of a user from public.user_access; null when the user has no access row';

revoke execute on function private.user_role_of(uuid) from public, anon;
grant execute on function private.user_role_of(uuid) to authenticated;

-- security invoker: reads the caller's jwt and the row being written; the owner's role
-- comes from private.user_role_of.
create or replace function private.guard_tracker_review()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_role text := (select private.jwt_role());
  owner_role public.user_role;
  is_entry_changed boolean;
begin
  -- service role and sql sessions have no user; they are trusted (seeds, maintenance)
  if caller_id is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'DELETE' then
    if old.status <> 'new' then
      raise exception 'Undo the review before deleting this entry.'
        using errcode = 'check_violation', hint = 'tracker_review.reviewed_locked';
    end if;

    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'new' then
      raise exception 'New time entries must start unreviewed.'
        using errcode = 'check_violation', hint = 'tracker_review.insert_reviewed';
    end if;

    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
    return new;
  end if;

  is_entry_changed := (
    new.date, new.description, new.duration_minutes, new.is_live, new.live_duration_minutes,
    new.live_status, new.start_live_date, new.project_id, new.user_id, new.transaction_id
  ) is distinct from (
    old.date, old.description, old.duration_minutes, old.is_live, old.live_duration_minutes,
    old.live_status, old.start_live_date, old.project_id, old.user_id, old.transaction_id
  );

  -- no status change: review data stays as it was, whatever the client sent
  if new.status = old.status then
    if old.status <> 'new' and is_entry_changed then
      raise exception 'Undo the review before changing this entry.'
        using errcode = 'check_violation', hint = 'tracker_review.reviewed_locked';
    end if;

    new.reviewed_at := old.reviewed_at;
    new.review_note := old.review_note;

    -- the reviewed_by fk (on delete set null) clears it when the reviewer's profile is deleted;
    -- let only that through, so the row never points at a missing user and clients still
    -- cannot rewrite who reviewed the entry
    if not (
      new.reviewed_by is null
      and old.reviewed_by is not null
      and not exists (select 1 from public.users u where u.id = old.reviewed_by)
    ) then
      new.reviewed_by := old.reviewed_by;
    end if;

    return new;
  end if;

  if caller_role is null or caller_role not in ('manager', 'admin') then
    raise exception 'Only managers and admins can review time entries.'
      using errcode = 'insufficient_privilege', hint = 'tracker_review.not_reviewer';
  end if;

  if caller_role = 'manager' then
    if old.user_id = caller_id then
      raise exception 'You cannot review your own time entries.'
        using errcode = 'insufficient_privilege', hint = 'tracker_review.own_entry';
    end if;

    owner_role := private.user_role_of(old.user_id);

    -- fail closed when the owner's role is unknown
    if owner_role is null or owner_role = 'admin' then
      raise exception 'Only an admin can review this time entry.'
        using errcode = 'insufficient_privilege', hint = 'tracker_review.admin_entry';
    end if;
  end if;

  if not (
    (old.status = 'new' and new.status in ('approved', 'rejected'))
    or (old.status in ('approved', 'rejected') and new.status = 'new')
  ) then
    raise exception 'Undo the current review before changing it.'
      using errcode = 'check_violation', hint = 'tracker_review.invalid_transition';
  end if;

  if is_entry_changed then
    raise exception 'A review cannot change the entry itself.'
      using errcode = 'check_violation', hint = 'tracker_review.entry_changed';
  end if;

  if old.is_live and old.live_status in ('start', 'pause') then
    raise exception 'A running timer cannot be reviewed.'
      using errcode = 'check_violation', hint = 'tracker_review.timer_running';
  end if;

  -- undo: the entry is unreviewed again and its owner may edit it
  if new.status = 'new' then
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
    return new;
  end if;

  if new.status = 'rejected' then
    new.review_note := nullif(pg_catalog.btrim(new.review_note), '');

    if new.review_note is null then
      raise exception 'Add a reason to reject this time entry.'
        using errcode = 'check_violation', hint = 'tracker_review.reason_required';
    end if;

    -- checked here so the app gets a stable key instead of a raw constraint violation
    if pg_catalog.char_length(new.review_note) > 500 then
      raise exception 'The rejection reason can be at most 500 characters.'
        using errcode = 'check_violation', hint = 'tracker_review.reason_too_long';
    end if;
  else
    new.review_note := null;
  end if;

  new.reviewed_by := caller_id;
  new.reviewed_at := pg_catalog.now();
  return new;
end;
$$;

comment on function private.guard_tracker_review() is
  'before write trigger: enforces who may approve/reject tracker entries, allowed status moves, locks reviewed entries against edits and deletes, and stamps review data';

revoke execute on function private.guard_tracker_review() from public, anon, authenticated;

create trigger guard_tracker_review
  before insert or update or delete on public.trackers
  for each row execute function private.guard_tracker_review();
