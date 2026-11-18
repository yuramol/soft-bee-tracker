-- migration: create invoices domain
-- purpose: add immutable billing snapshots, per-developer line items, and a
--   security-definer function that atomically prices approved time and creates an
--   invoice in one transaction. covers sbt-invoicing.
-- affected objects: sequence public.invoice_number_seq; tables public.invoices,
--   public.invoice_lines, column public.trackers.invoice_id; function
--   public.create_invoice(uuid, date, date); trigger private.guard_tracker_invoice_id();
--   rls policies and grants on both new tables.
-- special risks:
--   - create_invoice is security definer (runs as postgres / migration owner).
--     it checks the caller's jwt itself before writing anything.
--   - no insert/update/delete rls policies on invoices or invoice_lines; only
--     create_invoice may write them.
--   - the guard trigger on trackers prevents any role from clearing or reassigning
--     invoice_id outside create_invoice.
--   - trackers.invoice_id references invoices with on delete restrict, preventing
--     invoice deletion while linked entries exist.

-- ---------------------------------------------------------------------------
-- invoice number sequence (global, monotonically increasing; year appears in
-- the formatted number so human readability is preserved per year)
-- ---------------------------------------------------------------------------
create sequence public.invoice_number_seq start 1;

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  issue_date date not null,
  project_id uuid not null references public.projects (id) on delete restrict,
  project_name text not null,
  client_name text not null,
  period_start date not null,
  period_end date not null,
  issuer_id uuid references public.users (id) on delete restrict,
  issuer_name text not null,
  issuer_email text not null,
  currency text not null default 'USD',
  total numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint invoices_period_order check (period_end >= period_start),
  constraint invoices_total_non_negative check (total >= 0)
);

comment on table public.invoices is 'immutable billing snapshots per project and billing period';
comment on column public.invoices.number is 'human-readable number, e.g. INV-2026-0001; unique across all years';
comment on column public.invoices.project_name is 'snapshot of projects.name at creation time';
comment on column public.invoices.client_name is 'snapshot of projects.client at creation time';
comment on column public.invoices.issuer_name is 'snapshot of users.first_name || last_name at creation time';
comment on column public.invoices.issuer_email is 'snapshot of users.email at creation time';

create index invoices_project_id_idx on public.invoices (project_id);
create index invoices_issue_date_idx on public.invoices (issue_date);

alter table public.invoices enable row level security;

-- ---------------------------------------------------------------------------
-- invoice_lines
-- ---------------------------------------------------------------------------
create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  user_id uuid references public.users (id) on delete restrict,
  developer_name text not null,
  minutes integer not null,
  hours numeric(10, 4) not null,
  billing_rate numeric(10, 2) not null,
  amount numeric(12, 2) not null,
  constraint invoice_lines_minutes_positive check (minutes > 0),
  constraint invoice_lines_rate_positive check (billing_rate > 0),
  constraint invoice_lines_amount_non_negative check (amount >= 0)
);

comment on table public.invoice_lines is 'one row per developer per billing rate on an invoice';
comment on column public.invoice_lines.developer_name is 'snapshot of users.first_name || last_name at creation time';
comment on column public.invoice_lines.minutes is 'total approved minutes from linked tracker entries';
comment on column public.invoice_lines.hours is 'fractional hours (minutes / 60), stored for display';
comment on column public.invoice_lines.billing_rate is 'snapshot of project_rates.rate at creation time';
comment on column public.invoice_lines.amount is 'round(minutes * billing_rate / 60, 2)';

create index invoice_lines_invoice_id_idx on public.invoice_lines (invoice_id);

alter table public.invoice_lines enable row level security;

-- ---------------------------------------------------------------------------
-- trackers.invoice_id — link billed entries back to their invoice
-- ---------------------------------------------------------------------------
-- safety: on delete restrict prevents removing an invoice while tracker rows
-- still point to it. the guard trigger below prevents changing invoice_id
-- outside create_invoice.
alter table public.trackers
  add column invoice_id uuid references public.invoices (id) on delete restrict;

-- partial index: only rows that are actually billed need the lookup
create index trackers_invoice_id_idx on public.trackers (invoice_id)
  where invoice_id is not null;

-- ---------------------------------------------------------------------------
-- rls: restrictive gate on both new tables
-- ---------------------------------------------------------------------------
create policy "require secure session"
  on public.invoices
  as restrictive
  for all
  using ((select private.is_secure()))
  with check ((select private.is_secure()));

create policy "require secure session"
  on public.invoice_lines
  as restrictive
  for all
  using ((select private.is_secure()))
  with check ((select private.is_secure()));

-- ---------------------------------------------------------------------------
-- rls: select access for admins and the responsible project manager
-- ---------------------------------------------------------------------------
-- invoices: admin always; manager only on their projects
create policy "invoices_select_management"
  on public.invoices
  for select
  to authenticated
  using (
    (select private.is_admin())
    or ((select private.is_manager_or_admin()) and (select private.is_project_manager(project_id)))
  );

-- invoice_lines: visible when the parent invoice is visible
create policy "invoice_lines_select_management"
  on public.invoice_lines
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_id
        and (
          (select private.is_admin())
          or ((select private.is_manager_or_admin()) and (select private.is_project_manager(i.project_id)))
        )
    )
  );

-- no insert / update / delete policies: create_invoice (security definer) owns
-- all writes. direct inserts from the api are intentionally blocked.

-- ---------------------------------------------------------------------------
-- guard trigger: prevent changing trackers.invoice_id outside create_invoice
-- ---------------------------------------------------------------------------
-- the create_invoice function sets a transaction-local flag before updating
-- trackers so the trigger allows the change. all other updates that touch
-- invoice_id are rejected.
create or replace function private.guard_tracker_invoice_id()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- allow when create_invoice has set the transaction-local flag
  if current_setting('invoice.creating', true) = 'true' then
    return new;
  end if;

  if new.invoice_id is distinct from old.invoice_id then
    raise exception 'invoice_id cannot be changed outside the invoicing function'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function private.guard_tracker_invoice_id() is
  'prevents invoice_id from being changed on tracker rows outside create_invoice';

create trigger guard_tracker_invoice_id
  before update on public.trackers
  for each row execute function private.guard_tracker_invoice_id();

-- ---------------------------------------------------------------------------
-- create_invoice
-- ---------------------------------------------------------------------------
-- security definer justification: authenticated has no insert policy on
-- invoices or invoice_lines. all writes happen in one atomic transaction.
-- the function validates the caller's jwt itself before touching any data.
create or replace function public.create_invoice(
  target_project_id uuid,
  period_start date,
  period_end date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id  uuid    := (select auth.uid());
  issue_dt   date;
  inv_id     uuid    := pg_catalog.gen_random_uuid();
  inv_number text;
  proj_name  text;
  client_nm  text;
  issuer_nm  text;
  issuer_em  text;
  entry_count   int;
  missing_names text;
  inv_total     numeric(12, 2);
  linked_count  int;
begin
  -- guard: no anonymous call
  if caller_id is null then
    raise exception 'authentication required'
      using errcode = 'insufficient_privilege';
  end if;

  -- 1. permission: admin, or manager responsible for this project
  if not (
    coalesce((select private.jwt_role()) = 'admin', false)
    or (
      coalesce((select private.is_manager_or_admin()), false)
      and coalesce((select private.is_project_manager(target_project_id)), false)
    )
  ) then
    raise exception 'permission denied: only admins and the project''s responsible manager may create invoices'
      using errcode = 'insufficient_privilege';
  end if;

  -- 2. period sanity
  if period_start > period_end then
    raise exception 'period_start must not be later than period_end'
      using errcode = 'check_violation';
  end if;

  -- 3. lock candidate rows so a concurrent call either waits or gets zero rows.
  -- under read committed, after waiting for a concurrent lock holder to commit,
  -- postgresql re-evaluates the where clause; rows whose invoice_id was just set
  -- will no longer match invoice_id is null and will be excluded automatically.
  --
  -- drop any leftover temp table from a prior call in the same transaction (e.g. in tests
  -- or if a previous call failed after creating the table but before dropping it).
  drop table if exists _invoice_entries;

  create temp table _invoice_entries on commit drop as
  select t.id, t.user_id, t.duration_minutes
  from public.trackers t
  where t.project_id = target_project_id
    and t.status = 'approved'
    and t.invoice_id is null
    and t.date between period_start and period_end
    and t.duration_minutes > 0
    and not (t.is_live and t.live_status in ('start', 'pause'))
  for update;

  get diagnostics entry_count = row_count;

  -- 4. empty period
  if entry_count = 0 then
    raise exception 'no approved time entries to invoice for this period'
      using errcode = 'no_data_found';
  end if;

  -- 5. rate validation: every developer must have a positive client billing rate
  select
    string_agg(distinct u.first_name || ' ' || u.last_name, ', '
               order by u.first_name || ' ' || u.last_name)
  into missing_names
  from _invoice_entries e
  join public.users u on u.id = e.user_id
  where not exists (
    select 1
    from public.project_rates pr
    where pr.project_id = target_project_id
      and pr.user_id = e.user_id
      and pr.rate > 0
  );

  if missing_names is not null then
    raise exception 'a client billing rate is missing for: %', missing_names
      using errcode = 'no_data_found';
  end if;

  -- 6. snapshot project and issuer details
  select p.name, p.client
  into proj_name, client_nm
  from public.projects p
  where p.id = target_project_id;

  select u.first_name || ' ' || u.last_name, u.email
  into issuer_nm, issuer_em
  from public.users u
  where u.id = caller_id;

  -- issue date uses the company timezone (UTC+2 = Etc/GMT-2)
  issue_dt   := (now() at time zone 'Etc/GMT-2')::date;
  inv_number := 'INV-' || to_char(issue_dt, 'YYYY') || '-'
                || lpad(nextval('public.invoice_number_seq')::text, 4, '0');

  -- 7. compute invoice total (sum of rounded line amounts)
  select coalesce(sum(round(agg.total_minutes * pr.rate / 60, 2)), 0)
  into inv_total
  from (
    select e.user_id, sum(e.duration_minutes) as total_minutes
    from _invoice_entries e
    group by e.user_id
  ) agg
  join public.project_rates pr
    on pr.project_id = target_project_id and pr.user_id = agg.user_id;

  -- 8. set transaction-local flag so the guard trigger allows our invoice_id update
  perform set_config('invoice.creating', 'true', true);

  -- 9. insert invoice header
  insert into public.invoices (
    id, number, issue_date,
    project_id, project_name, client_name,
    period_start, period_end,
    issuer_id, issuer_name, issuer_email,
    currency, total
  ) values (
    inv_id, inv_number, issue_dt,
    target_project_id, proj_name, client_nm,
    period_start, period_end,
    caller_id, coalesce(issuer_nm, ''), coalesce(issuer_em, ''),
    'USD', inv_total
  );

  -- 10. insert line items (one per developer, summing their approved minutes)
  insert into public.invoice_lines (
    invoice_id, user_id, developer_name,
    minutes, hours, billing_rate, amount
  )
  select
    inv_id,
    agg.user_id,
    u.first_name || ' ' || u.last_name,
    agg.total_minutes,
    round(agg.total_minutes::numeric / 60, 4),
    pr.rate,
    round(agg.total_minutes * pr.rate / 60, 2)
  from (
    select e.user_id, sum(e.duration_minutes)::integer as total_minutes
    from _invoice_entries e
    group by e.user_id
  ) agg
  join public.users u on u.id = agg.user_id
  join public.project_rates pr
    on pr.project_id = target_project_id and pr.user_id = agg.user_id
  order by u.first_name, u.last_name;

  -- 11. link tracker entries; re-check invoice_id is null for the race-condition guard
  update public.trackers
  set invoice_id = inv_id
  where id in (select id from _invoice_entries)
    and invoice_id is null;

  get diagnostics linked_count = row_count;

  -- this mismatch indicates a logic error (should never happen with the for update lock)
  if linked_count <> entry_count then
    raise exception 'invoice link count mismatch: expected %, got %', entry_count, linked_count
      using errcode = 'data_exception';
  end if;

  -- clean up and reset the flag so direct invoice_id changes remain blocked again.
  -- on commit drop would only clean up at transaction end, which is too late when the
  -- function is called multiple times within the same transaction (e.g. in tests).
  drop table if exists _invoice_entries;
  perform set_config('invoice.creating', 'false', true);

  return inv_id;
end;
$$;

comment on function public.create_invoice(uuid, date, date) is
  'atomically prices approved unbilled tracker entries for a project period and saves a snapshot invoice';

-- ---------------------------------------------------------------------------
-- grants
-- ---------------------------------------------------------------------------
grant select on table public.invoices to authenticated;
grant select on table public.invoice_lines to authenticated;
grant all on table public.invoices to service_role;
grant all on table public.invoice_lines to service_role;

-- sequence: only needed by the security-definer function (runs as postgres/owner).
-- service_role may also need it for seeding/testing.
grant usage on sequence public.invoice_number_seq to service_role;

revoke execute on function public.create_invoice(uuid, date, date) from public, anon;
grant execute on function public.create_invoice(uuid, date, date) to authenticated;

revoke execute on function private.guard_tracker_invoice_id() from public, anon;
