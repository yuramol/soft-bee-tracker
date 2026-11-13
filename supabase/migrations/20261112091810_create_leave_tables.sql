-- migration: create leave tables
-- purpose: store absence requests (vacation, sick leave) and optional yearly
--   allowances so the tracker leave panel, calendar and summary use real data.
-- affected objects: extension btree_gist; types public.leave_type, public.leave_status;
--   tables public.leave_requests, public.leave_allowances; function
--   private.guard_leave_request(); triggers, indexes, rls policies and grants on both tables
-- special risks:
--   - managers and admins (jwt user_role) can read every request and decide on them;
--     a manager cannot decide on their own request, only an admin can.
--   - workers can create pending requests for themselves and cancel them while pending;
--     every other status change is rejected by private.guard_leave_request().
--   - managers can set allowances for other users, not their own; admins for anyone.
--   - anon gets no privileges on either table (supabase default privileges would
--     otherwise grant them; rls was the only guard).

-- rules agreed for the absences epic (sbt-27 / sbt-84):
--   types: vacation, sick_leave. unit: whole working days, weekends excluded,
--   no public holidays or half days yet. statuses: pending -> approved | rejected | cancelled,
--   approved -> cancelled (managers/admins only). no overlap between a user's pending
--   or approved requests. balances come from leave_allowances; no row means "not set".

create extension if not exists btree_gist with schema extensions;

create type public.leave_type as enum ('vacation', 'sick_leave');

create type public.leave_status as enum ('pending', 'approved', 'rejected', 'cancelled');

-- ---------------------------------------------------------------------------
-- leave_requests
-- ---------------------------------------------------------------------------

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null default auth.uid() references public.users (id) on delete cascade,
  leave_type public.leave_type not null,
  start_date date not null,
  end_date date not null,
  note text,
  status public.leave_status not null default 'pending',
  decided_by uuid references public.users (id) on delete set null,
  decided_at timestamptz,
  constraint leave_requests_date_order check (end_date >= start_date),
  constraint leave_requests_note_length check (note is null or char_length(note) <= 500),
  -- one person cannot be away twice on the same day; rejected and cancelled
  -- requests no longer count, so the same dates can be requested again
  constraint leave_requests_no_overlap exclude using gist (
    user_id extensions.gist_uuid_ops with =,
    daterange(start_date, end_date, '[]') with &&
  ) where (status in ('pending', 'approved'))
);

comment on table public.leave_requests is 'absence requests; dates are inclusive and counted in working days';
comment on column public.leave_requests.decided_by is 'user who last changed the status (approved, rejected or cancelled)';

create index leave_requests_user_id_idx on public.leave_requests (user_id);
create index leave_requests_status_idx on public.leave_requests (status);
create index leave_requests_decided_by_idx on public.leave_requests (decided_by);

create trigger set_leave_requests_updated_at
  before update on public.leave_requests
  for each row execute function public.trigger_set_updated_at();

-- validates who may write what. kept in a trigger because rls cannot compare
-- old and new values, which status transitions need.
-- security invoker: it only reads the caller's own jwt and the row being written.
create or replace function private.guard_leave_request()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  is_management boolean := (select private.is_manager_or_admin());
  is_admin boolean := coalesce((select private.jwt_role()) = 'admin', false);
  caller_id uuid := (select auth.uid());
begin
  -- service role and sql editor sessions have no user; they are trusted
  if caller_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if not exists (
      select 1
      -- timestamp without time zone so the session time zone cannot shift a day
      from pg_catalog.generate_series(new.start_date::timestamp, new.end_date::timestamp, interval '1 day') as day
      where extract(isodow from day) < 6
    ) then
      raise exception 'leave must include at least one working day' using errcode = 'check_violation';
    end if;

    if new.status not in ('pending', 'approved') then
      raise exception 'a new request must be pending or approved' using errcode = 'check_violation';
    end if;

    if new.status = 'approved' and new.user_id = caller_id and not is_admin then
      raise exception 'only an admin can approve their own leave' using errcode = 'insufficient_privilege';
    end if;

    new.decided_by := case when new.status = 'pending' then null else caller_id end;
    new.decided_at := case when new.status = 'pending' then null else now() end;
    return new;
  end if;

  -- update: once submitted, only the status changes
  if new.user_id is distinct from old.user_id
    or new.leave_type is distinct from old.leave_type
    or new.start_date is distinct from old.start_date
    or new.end_date is distinct from old.end_date
    or new.note is distinct from old.note then
    raise exception 'a submitted request cannot be edited; cancel it and request again'
      using errcode = 'check_violation';
  end if;

  if new.status = old.status then
    raise exception 'this request is already %', old.status using errcode = 'check_violation';
  end if;

  if not (
    (old.status = 'pending' and new.status in ('approved', 'rejected', 'cancelled'))
    or (old.status = 'approved' and new.status = 'cancelled')
  ) then
    raise exception 'a % request cannot become %', old.status, new.status using errcode = 'check_violation';
  end if;

  -- the owner may withdraw a pending request; every other change is a decision
  if not (old.user_id = caller_id and old.status = 'pending' and new.status = 'cancelled') then
    if not is_management then
      raise exception 'only a manager or admin can change this request' using errcode = 'insufficient_privilege';
    end if;

    if old.user_id = caller_id and not is_admin then
      raise exception 'only an admin can decide on their own leave' using errcode = 'insufficient_privilege';
    end if;
  end if;

  new.decided_by := caller_id;
  new.decided_at := now();
  return new;
end;
$$;

comment on function private.guard_leave_request() is
  'enforces leave request status transitions and who may make them';

grant execute on function private.guard_leave_request() to authenticated, service_role;

create trigger guard_leave_request
  before insert or update on public.leave_requests
  for each row execute function private.guard_leave_request();

alter table public.leave_requests enable row level security;

create policy "require secure session"
  on public.leave_requests
  as restrictive
  for all
  using ((select private.is_secure()))
  with check ((select private.is_secure()));

create policy "leave_requests_select_own_or_management"
  on public.leave_requests
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_manager_or_admin())
  );

-- workers request for themselves and always start pending;
-- managers and admins may also record leave for others (grant from crew)
create policy "leave_requests_insert_own_or_management"
  on public.leave_requests
  for insert
  to authenticated
  with check (
    (select private.is_manager_or_admin())
    or (
      user_id = (select auth.uid())
      and status = 'pending'
    )
  );

-- row access only; the guard trigger decides which transition is allowed
create policy "leave_requests_update_own_pending_or_management"
  on public.leave_requests
  for update
  to authenticated
  using (
    (select private.is_manager_or_admin())
    or (
      user_id = (select auth.uid())
      and status = 'pending'
    )
  )
  with check (
    (select private.is_manager_or_admin())
    or (
      user_id = (select auth.uid())
      and status = 'cancelled'
    )
  );

-- no delete policy: requests are cancelled, never deleted, so history stays intact

-- safety: revokes only remove supabase default privileges on this brand-new table
revoke all on table public.leave_requests from anon, authenticated;
grant select on table public.leave_requests to authenticated;
grant insert (user_id, leave_type, start_date, end_date, note, status) on table public.leave_requests to authenticated;
grant update (status) on table public.leave_requests to authenticated;
grant all on table public.leave_requests to service_role;

-- ---------------------------------------------------------------------------
-- leave_allowances
-- ---------------------------------------------------------------------------

create table public.leave_allowances (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.users (id) on delete cascade,
  year smallint not null,
  leave_type public.leave_type not null,
  days integer not null,
  constraint leave_allowances_year_range check (year between 2000 and 2100),
  constraint leave_allowances_days_range check (days between 0 and 366),
  constraint leave_allowances_user_year_type_key unique (user_id, year, leave_type)
);

comment on table public.leave_allowances is 'working days per user, year and leave type; no row means no allowance is set';

create trigger set_leave_allowances_updated_at
  before update on public.leave_allowances
  for each row execute function public.trigger_set_updated_at();

alter table public.leave_allowances enable row level security;

create policy "require secure session"
  on public.leave_allowances
  as restrictive
  for all
  using ((select private.is_secure()))
  with check ((select private.is_secure()));

create policy "leave_allowances_select_own_or_management"
  on public.leave_allowances
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_manager_or_admin())
  );

-- managers set other people's allowances, never their own (the same rule as deciding
-- on their own leave); admins may set anyone's, their own included
create policy "leave_allowances_insert_management"
  on public.leave_allowances
  for insert
  to authenticated
  with check (
    (select private.is_manager_or_admin())
    and (user_id <> (select auth.uid()) or (select private.jwt_role()) = 'admin')
  );

create policy "leave_allowances_update_management"
  on public.leave_allowances
  for update
  to authenticated
  using (
    (select private.is_manager_or_admin())
    and (user_id <> (select auth.uid()) or (select private.jwt_role()) = 'admin')
  )
  with check (
    (select private.is_manager_or_admin())
    and (user_id <> (select auth.uid()) or (select private.jwt_role()) = 'admin')
  );

create policy "leave_allowances_delete_management"
  on public.leave_allowances
  for delete
  to authenticated
  using (
    (select private.is_manager_or_admin())
    and (user_id <> (select auth.uid()) or (select private.jwt_role()) = 'admin')
  );

-- safety: revokes only remove supabase default privileges on this brand-new table
revoke all on table public.leave_allowances from anon, authenticated;
grant select, insert, update, delete on table public.leave_allowances to authenticated;
grant all on table public.leave_allowances to service_role;
