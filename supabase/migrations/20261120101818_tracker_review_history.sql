-- migration: tracker review history
-- purpose: keep every approve, reject and undo of a time entry, with who did it, when and
--   why, instead of only the latest review on the row. undoing a review now always needs a
--   reason, so overriding someone else's decision (for example a manager undoing an admin's
--   rejection) leaves an explanation behind.
-- affected objects: type public.tracker_review_action; table public.tracker_reviews with
--   indexes, checks and rls policies; functions private.guard_tracker_review() (replaced:
--   undo reason) and private.log_tracker_review(); trigger log_tracker_review on public.trackers
-- special risks:
--   - undo without a reason now fails (hint tracker_review.undo_reason_required); the app
--     sends one from this release on. the undo reason stays in trackers.review_note until
--     the next review, which is where the history trigger reads it from.
--   - only managers and admins can read the history; staff see the current status and
--     rejection reason on the entry itself.
--   - rows are written only by the log trigger. reviews made by trusted sessions (service
--     role, sql, seeds) are not recorded.
--   - history outlives its entry: deleting an entry (possible only while it is new) keeps its
--     rows with tracker_id set to null, readable by admins only.
--   - no changes to existing data.

create type public.tracker_review_action as enum ('approved', 'rejected', 'undone');

create table public.tracker_reviews (
  id uuid primary key default gen_random_uuid(),
  -- clock_timestamp, not now(): several decisions in one transaction still keep their order
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  -- set null, not cascade: deleting an entry must not erase the decisions made about it
  tracker_id uuid references public.trackers (id) on delete set null,
  action public.tracker_review_action not null,
  -- null once the reviewer's profile is deleted; the history row itself stays
  actor_id uuid references public.users (id) on delete set null,
  note text,
  previous_status public.tracker_status not null,
  constraint tracker_reviews_note_length_check check (note is null or pg_catalog.char_length(note) <= 500),
  -- rejecting and undoing always explain themselves
  constraint tracker_reviews_note_required_check check (action = 'approved' or note is not null)
);

comment on table public.tracker_reviews is 'append-only log of approve / reject / undo decisions on public.trackers rows';

create index tracker_reviews_tracker_id_idx on public.tracker_reviews (tracker_id);
create index tracker_reviews_actor_id_idx on public.tracker_reviews (actor_id);

alter table public.tracker_reviews enable row level security;

create policy "require secure session"
  on public.tracker_reviews
  as restrictive
  for all
  using ((select private.is_secure()))
  with check ((select private.is_secure()));

-- admins read everything, including history of deleted entries. managers read history of
-- entries they can see: the trackers select policy inside the exists limits them to their
-- projects. staff have no access to the history.
create policy "tracker_reviews_select_management"
  on public.tracker_reviews
  for select
  to authenticated
  using (
    (select private.is_admin())
    or (
      (select private.is_manager_or_admin())
      and exists (
        select 1
        from public.trackers t
        where t.id = tracker_reviews.tracker_id
      )
    )
  );

-- no insert, update or delete policies: rows come only from private.log_tracker_review
-- safety: fresh stacks grant api roles everything by default, including truncate
revoke all on table public.tracker_reviews from anon, authenticated;
grant select on table public.tracker_reviews to authenticated;
grant all on table public.tracker_reviews to service_role;

-- same rules as 20261120101817_tracker_review.sql, plus: undo needs a reason, which stays
-- on the row for private.log_tracker_review to record
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
  note text;
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

  note := nullif(pg_catalog.btrim(new.review_note), '');

  if new.status = 'approved' then
    note := null;
  elsif note is null then
    if new.status = 'new' then
      raise exception 'Add a reason to undo this review.'
        using errcode = 'check_violation', hint = 'tracker_review.undo_reason_required';
    end if;

    raise exception 'Add a reason to reject this time entry.'
      using errcode = 'check_violation', hint = 'tracker_review.reason_required';
  end if;

  -- checked here so the app gets a stable key instead of a raw constraint violation
  if pg_catalog.char_length(note) > 500 then
    raise exception 'The reason can be at most 500 characters.'
      using errcode = 'check_violation', hint = 'tracker_review.reason_too_long';
  end if;

  -- the reason of a reject or an undo stays on the row; log_tracker_review records it
  new.review_note := note;

  -- undo: the entry is unreviewed again and its owner may edit it
  if new.status = 'new' then
    new.reviewed_by := null;
    new.reviewed_at := null;
    return new;
  end if;

  new.reviewed_by := caller_id;
  new.reviewed_at := pg_catalog.now();
  return new;
end;
$$;

comment on function private.guard_tracker_review() is
  'before write trigger: enforces who may approve/reject/undo tracker entries, locks reviewed entries against edits and deletes, and stamps review data';

comment on column public.trackers.review_note is
  'reason of the latest reject or undo (shown to staff only while rejected); the full log is public.tracker_reviews';

-- security definer justification: callers have no insert right on public.tracker_reviews,
-- so the log cannot be written through the api. a trigger function cannot be called
-- directly (or from another function), so this cannot be used to forge history; it only
-- runs after a status change the guard trigger already accepted, and the actor is always
-- auth.uid().
create or replace function private.log_tracker_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- trusted sessions (service role, sql, seeds) are not recorded
  if (select auth.uid()) is null or new.status = old.status then
    return null;
  end if;

  insert into public.tracker_reviews (tracker_id, action, actor_id, note, previous_status)
  values (
    new.id,
    case new.status when 'new' then 'undone' else new.status::text end::public.tracker_review_action,
    (select auth.uid()),
    new.review_note,
    old.status
  );

  return null;
end;
$$;

comment on function private.log_tracker_review() is
  'after update trigger: appends one tracker_reviews row per status change made by a user';

revoke execute on function private.log_tracker_review() from public, anon, authenticated;

create trigger log_tracker_review
  after update of status on public.trackers
  for each row execute function private.log_tracker_review();
