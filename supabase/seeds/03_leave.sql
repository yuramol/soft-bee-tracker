-- seed: local development leave allowances and requests
-- dates are relative to the reset day so the tracker always has something to show:
--   worker: 20 vacation / 10 sick days this year, an approved vacation last Thursday-Friday
--   and a pending vacation four weeks from now. manager: allowances only.
-- seeds run without a jwt, so private.guard_leave_request() lets them through as trusted.

insert into public.leave_allowances (user_id, year, leave_type, days)
select u.id, extract(year from current_date)::smallint, allowance.leave_type, allowance.days
from public.users u
cross join (
  values
    ('vacation'::public.leave_type, 20),
    ('sick_leave'::public.leave_type, 10)
) as allowance (leave_type, days)
where u.email in ('worker@softbee.dev', 'manager@softbee.dev');

insert into public.leave_requests (user_id, leave_type, start_date, end_date, note, status, decided_by, decided_at)
select
  worker.id,
  'vacation',
  date_trunc('week', current_date)::date - 4,
  date_trunc('week', current_date)::date - 3,
  null,
  'approved',
  manager.id,
  now()
from public.users worker, public.users manager
where worker.email = 'worker@softbee.dev'
  and manager.email = 'manager@softbee.dev';

insert into public.leave_requests (user_id, leave_type, start_date, end_date, note, status)
select
  id,
  'vacation',
  date_trunc('week', current_date + 28)::date,
  date_trunc('week', current_date + 28)::date + 4,
  'Family trip',
  'pending'
from public.users
where email = 'worker@softbee.dev';
