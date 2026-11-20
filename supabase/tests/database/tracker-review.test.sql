begin;

select plan(46);

-- returns the hint of the error a statement raises (null when it succeeds). the app maps
-- these stable keys, so tests assert them instead of message text. runs as the caller.
create function pg_temp.review_hint(statement text)
returns text
language plpgsql
as $fn$
declare
  error_hint text;
begin
  execute statement;
  return null;
exception when others then
  get stacked diagnostics error_hint = pg_exception_hint;
  return error_hint;
end;
$fn$;

-- seeded: admin a01, manager a02 (responsible for b01), worker a03 (assigned to b01).
-- entries are written as a trusted session in the current (open) month.
-- wipe leftover history from local manual testing so deleted-entry (tracker_id null)
-- assertions stay deterministic
delete from public.tracker_reviews;

insert into public.trackers (id, date, duration_minutes, project_id, user_id)
values
  ('00000000-0000-0000-0000-00000000e001', current_date, 60, '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03'),
  ('00000000-0000-0000-0000-00000000e002', current_date, 60, '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03'),
  ('00000000-0000-0000-0000-00000000e003', current_date, 60, '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03'),
  ('00000000-0000-0000-0000-00000000e004', current_date, 60, '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a02'),
  ('00000000-0000-0000-0000-00000000e005', current_date, 60, '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a01');

insert into public.trackers (id, date, duration_minutes, is_live, live_status, start_live_date, project_id, user_id)
values
  ('00000000-0000-0000-0000-00000000e006', current_date, 0, true, 'start', now(), '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03');

-- the manager's own entry, already approved by the admin
insert into public.trackers (id, date, duration_minutes, status, reviewed_by, reviewed_at, project_id, user_id)
values
  ('00000000-0000-0000-0000-00000000e007', current_date, 60, 'approved', '00000000-0000-0000-0000-000000000a01', now(),
   '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a02');

-- a second manager owns a project a02 does not manage; worker a03 has an entry there
insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-00000000f012', 'manager2@review.test', '{"username": "review-manager-two"}');

update public.user_access set role = 'manager' where user_id = '00000000-0000-0000-0000-00000000f012';

insert into public.projects (id, name, manager_id)
values ('00000000-0000-0000-0000-00000000fb12', 'Review other project', '00000000-0000-0000-0000-00000000f012');

insert into public.project_members (project_id, user_id)
values ('00000000-0000-0000-0000-00000000fb12', '00000000-0000-0000-0000-000000000a03');

insert into public.trackers (id, date, duration_minutes, project_id, user_id)
values ('00000000-0000-0000-0000-00000000e009', current_date, 45, '00000000-0000-0000-0000-00000000fb12', '00000000-0000-0000-0000-000000000a03');

set local role authenticated;

-- worker
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a03","role":"authenticated","user_role":"worker"}', true);

select throws_ok(
  $$update public.trackers set status = 'approved' where id = '00000000-0000-0000-0000-00000000e003'$$,
  '42501',
  null,
  'a worker cannot approve an entry'
);

select is(
  pg_temp.review_hint($$update public.trackers set status = 'rejected', review_note = 'no' where id = '00000000-0000-0000-0000-00000000e003'$$),
  'tracker_review.not_reviewer',
  'a worker cannot reject an entry'
);

select throws_ok(
  $$insert into public.trackers (date, duration_minutes, project_id, status)
    values (current_date, 30, '00000000-0000-0000-0000-000000000b01', 'approved')$$,
  '23514',
  null,
  'a worker cannot log an entry as already approved'
);

select lives_ok(
  $$update public.trackers
    set reviewed_by = '00000000-0000-0000-0000-000000000a03', reviewed_at = now(), review_note = 'forged'
    where id = '00000000-0000-0000-0000-00000000e003'$$,
  'a worker update that touches review data still succeeds'
);

select is(
  (select row(reviewed_by, reviewed_at, review_note)::text from public.trackers where id = '00000000-0000-0000-0000-00000000e003'),
  row(null::uuid, null::timestamptz, null::text)::text,
  'review data cannot be forged without a review'
);

-- manager of b01
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a02","role":"authenticated","user_role":"manager"}', true);

select lives_ok(
  $$update public.trackers set status = 'approved' where id = '00000000-0000-0000-0000-00000000e001'$$,
  'a manager can approve a staff entry on their project'
);

select is(
  (select row(status, reviewed_by, reviewed_at is not null, review_note)::text from public.trackers where id = '00000000-0000-0000-0000-00000000e001'),
  row('approved'::public.tracker_status, '00000000-0000-0000-0000-000000000a02'::uuid, true, null::text)::text,
  'approval stamps the reviewer and time'
);

select is(
  pg_temp.review_hint($$update public.trackers set status = 'rejected' where id = '00000000-0000-0000-0000-00000000e002'$$),
  'tracker_review.reason_required',
  'rejecting needs a reason'
);

select is(
  pg_temp.review_hint($$update public.trackers set status = 'rejected', review_note = '   ' where id = '00000000-0000-0000-0000-00000000e002'$$),
  'tracker_review.reason_required',
  'a blank reason is not a reason'
);

select is(
  pg_temp.review_hint(format(
    $$update public.trackers set status = 'rejected', review_note = %L where id = '00000000-0000-0000-0000-00000000e002'$$,
    repeat('a', 501)
  )),
  'tracker_review.reason_too_long',
  'a reason over 500 characters gets its own key, not a raw constraint error'
);

select lives_ok(
  $$update public.trackers set status = 'rejected', review_note = '  Wrong project  ' where id = '00000000-0000-0000-0000-00000000e002'$$,
  'a manager can reject a staff entry with a reason'
);

select is(
  (select row(status, reviewed_by, review_note)::text from public.trackers where id = '00000000-0000-0000-0000-00000000e002'),
  row('rejected'::public.tracker_status, '00000000-0000-0000-0000-000000000a02'::uuid, 'Wrong project')::text,
  'rejection stores the trimmed reason and the reviewer'
);

select is(
  pg_temp.review_hint($$update public.trackers set status = 'rejected', review_note = 'changed my mind' where id = '00000000-0000-0000-0000-00000000e001'$$),
  'tracker_review.invalid_transition',
  'an approved entry cannot jump straight to rejected'
);

select is(
  pg_temp.review_hint($$update public.trackers set status = 'approved' where id = '00000000-0000-0000-0000-00000000e004'$$),
  'tracker_review.own_entry',
  'a manager cannot approve their own entry'
);

select is(
  pg_temp.review_hint($$update public.trackers set status = 'approved' where id = '00000000-0000-0000-0000-00000000e005'$$),
  'tracker_review.admin_entry',
  'a manager cannot approve an admin entry'
);

select is(
  pg_temp.review_hint($$update public.trackers set status = 'approved', duration_minutes = 600 where id = '00000000-0000-0000-0000-00000000e003'$$),
  'tracker_review.entry_changed',
  'a review cannot carry other edits'
);

select is(
  pg_temp.review_hint($$update public.trackers set status = 'approved' where id = '00000000-0000-0000-0000-00000000e006'$$),
  'tracker_review.timer_running',
  'a running timer cannot be approved'
);

select is(
  pg_temp.review_hint($$update public.trackers set duration_minutes = 600 where id = '00000000-0000-0000-0000-00000000e001'$$),
  'tracker_review.reviewed_locked',
  'a manager cannot edit an approved entry in place'
);

select is(
  pg_temp.review_hint($$update public.trackers set is_live = true, live_status = 'start', start_live_date = now() where id = '00000000-0000-0000-0000-00000000e001'$$),
  'tracker_review.reviewed_locked',
  'a manager cannot restart a timer on an approved entry'
);

select is(
  pg_temp.review_hint($$update public.trackers set duration_minutes = 600 where id = '00000000-0000-0000-0000-00000000e007'$$),
  'tracker_review.reviewed_locked',
  'a manager cannot change their own admin-approved entry and keep the approval'
);

select is(
  pg_temp.review_hint($$delete from public.trackers where id = '00000000-0000-0000-0000-00000000e007'$$),
  'tracker_review.reviewed_locked',
  'a manager cannot delete their own admin-approved entry and log it again'
);

-- rls hides the row: update matches zero rows (no trigger hint), status stays new
update public.trackers set status = 'approved' where id = '00000000-0000-0000-0000-00000000e009';

select is(
  (select count(*)::int from public.trackers where id = '00000000-0000-0000-0000-00000000e009'),
  0,
  'a manager does not see entries on projects they do not manage'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a01","role":"authenticated","user_role":"admin"}', true);

select is(
  (select row(status, reviewed_by)::text from public.trackers where id = '00000000-0000-0000-0000-00000000e009'),
  row('new'::public.tracker_status, null::uuid)::text,
  'a manager cannot approve an entry on a project they do not manage'
);

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a02","role":"authenticated","user_role":"manager"}', true);

select is(
  pg_temp.review_hint($$update public.trackers set status = 'new' where id = '00000000-0000-0000-0000-00000000e001'$$),
  'tracker_review.undo_reason_required',
  'undoing a review needs a reason'
);

select lives_ok(
  $$update public.trackers set status = 'new', review_note = 'Approved the wrong day' where id = '00000000-0000-0000-0000-00000000e001'$$,
  'a manager can undo an approval with a reason'
);

select is(
  (select array_agg(row(action, actor_id, note, previous_status)::text order by created_at)
   from public.tracker_reviews where tracker_id = '00000000-0000-0000-0000-00000000e001'),
  array[
    row('approved'::public.tracker_review_action, '00000000-0000-0000-0000-000000000a02'::uuid, null::text, 'new'::public.tracker_status)::text,
    row('undone'::public.tracker_review_action, '00000000-0000-0000-0000-000000000a02'::uuid, 'Approved the wrong day', 'approved'::public.tracker_status)::text
  ],
  'history keeps the approval and the undo with its reason'
);

select is(
  (select note from public.tracker_reviews where tracker_id = '00000000-0000-0000-0000-00000000e002' and action = 'rejected'),
  'Wrong project',
  'history keeps the rejection reason'
);

select throws_ok(
  $$insert into public.tracker_reviews (tracker_id, action, actor_id, note, previous_status)
    values ('00000000-0000-0000-0000-00000000e003', 'approved', '00000000-0000-0000-0000-000000000a02', null, 'new')$$,
  '42501',
  null,
  'history cannot be written through the api'
);

select throws_ok(
  $$select private.log_tracker_review()$$,
  '42501',
  null,
  'the history writer cannot be called directly'
);

select is(
  (select row(status, reviewed_by, reviewed_at)::text from public.trackers where id = '00000000-0000-0000-0000-00000000e001'),
  row('new'::public.tracker_status, null::uuid, null::timestamptz)::text,
  'undo clears the review data'
);

-- worker again: the undone entry is open, the rejected one is locked
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a03","role":"authenticated","user_role":"worker"}', true);

select lives_ok(
  $$update public.trackers set duration_minutes = 90 where id = '00000000-0000-0000-0000-00000000e001'$$,
  'a worker can edit an entry after its review was undone'
);

select lives_ok(
  $$delete from public.trackers where id = '00000000-0000-0000-0000-00000000e001'$$,
  'a worker can delete an entry that is new again'
);

update public.trackers set duration_minutes = 5 where id = '00000000-0000-0000-0000-00000000e002';

select is(
  (select count(*)::int from public.tracker_reviews),
  0,
  'staff cannot read review history'
);

select is(
  (select duration_minutes from public.trackers where id = '00000000-0000-0000-0000-00000000e002'),
  60,
  'a worker cannot edit a rejected entry'
);

-- admin
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a01","role":"authenticated","user_role":"admin"}', true);

select is(
  pg_temp.review_hint($$update public.trackers set duration_minutes = 30 where id = '00000000-0000-0000-0000-00000000e007'$$),
  'tracker_review.reviewed_locked',
  'an admin also undoes a review before editing the entry'
);

select lives_ok(
  $$update public.trackers set status = 'approved' where id = '00000000-0000-0000-0000-00000000e004'$$,
  'an admin can approve a manager entry'
);

select is(
  pg_temp.review_hint($$delete from public.trackers where id = '00000000-0000-0000-0000-00000000e004'$$),
  'tracker_review.reviewed_locked',
  'an admin also undoes a review before deleting the entry'
);

select lives_ok(
  $$update public.trackers set status = 'approved' where id = '00000000-0000-0000-0000-00000000e005'$$,
  'an admin can approve their own entry'
);

select lives_ok(
  $$update public.trackers set status = 'new', review_note = 'Project was right after all' where id = '00000000-0000-0000-0000-00000000e002'$$,
  'an admin can undo another reviewer''s rejection'
);

select is(
  (select review_note from public.trackers where id = '00000000-0000-0000-0000-00000000e002'),
  'Project was right after all',
  'undo replaces the rejection reason with the undo reason (read by the history trigger)'
);

select is(
  (select count(*)::int from public.tracker_reviews where tracker_id = '00000000-0000-0000-0000-00000000e002'),
  2,
  'an admin sees the whole history of an entry'
);

select is(
  (select array_agg(action::text order by created_at) from public.tracker_reviews where tracker_id is null),
  array['approved', 'undone'],
  'history of a deleted entry survives and admins still see it'
);

-- manager again: overriding an admin's decision is allowed, with a reason
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a02","role":"authenticated","user_role":"manager"}', true);

select lives_ok(
  $$update public.trackers set status = 'rejected', review_note = 'Duplicate of another entry' where id = '00000000-0000-0000-0000-00000000e002'$$,
  'a manager can reject again after the admin undo'
);

select is(
  (select array_agg(action::text order by created_at) from public.tracker_reviews where tracker_id = '00000000-0000-0000-0000-00000000e002'),
  array['rejected', 'undone', 'rejected'],
  'a manager sees the history of entries on their project, in order'
);

select is(
  (select count(*)::int from public.tracker_reviews where tracker_id is null),
  0,
  'managers do not see history of deleted entries'
);

-- deleting a reviewer's profile clears reviewed_by (fk on delete set null) even from a
-- session with a user, instead of the trigger putting the deleted id back
reset role;
select set_config('request.jwt.claims', '', true);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change)
values ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000a99', 'authenticated',
  'authenticated', 'former-reviewer@softbee.test', '', now(), '{"provider": "email", "providers": ["email"]}',
  '{"username": "former-reviewer", "first_name": "Former", "last_name": "Reviewer"}', now(), now(), '', '', '', '');

insert into public.trackers (id, date, duration_minutes, status, reviewed_by, reviewed_at, project_id, user_id)
values ('00000000-0000-0000-0000-00000000e008', current_date, 30, 'approved', '00000000-0000-0000-0000-000000000a99', now(),
  '00000000-0000-0000-0000-000000000b01', '00000000-0000-0000-0000-000000000a03');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000a01","role":"authenticated","user_role":"admin"}', true);

delete from public.users where id = '00000000-0000-0000-0000-000000000a99';

select is(
  (select row(status, reviewed_by)::text from public.trackers where id = '00000000-0000-0000-0000-00000000e008'),
  row('approved'::public.tracker_status, null::uuid)::text,
  'a deleted reviewer leaves no dangling reviewed_by'
);

select * from finish();

rollback;
