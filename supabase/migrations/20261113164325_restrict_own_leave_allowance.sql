-- purpose: managers can no longer set their own leave allowance.
--   a manager can't approve their own leave (private.guard_leave_request), but the
--   leave_allowances write policies let them raise their own allowance. writes now
--   follow the same rule as leave decisions: managers for other people only,
--   admins for anyone, their own row included.
-- affected objects: policies leave_allowances_insert_management,
--   leave_allowances_update_management, leave_allowances_delete_management.
-- special risks: none to data. `alter policy` only narrows who may write; reads,
--   grants and the restrictive "require secure session" policy are unchanged.
--   a follow-up rather than an edit of 20261112091810, so databases that already
--   applied that migration pick the change up without a reset.

-- safety: narrows an existing permissive policy; no rows are touched
alter policy "leave_allowances_insert_management"
  on public.leave_allowances
  with check (
    (select private.is_manager_or_admin())
    and (user_id <> (select auth.uid()) or (select private.jwt_role()) = 'admin')
  );

-- safety: narrows an existing permissive policy; no rows are touched
alter policy "leave_allowances_update_management"
  on public.leave_allowances
  using (
    (select private.is_manager_or_admin())
    and (user_id <> (select auth.uid()) or (select private.jwt_role()) = 'admin')
  )
  with check (
    (select private.is_manager_or_admin())
    and (user_id <> (select auth.uid()) or (select private.jwt_role()) = 'admin')
  );

-- safety: narrows an existing permissive policy; no rows are touched
alter policy "leave_allowances_delete_management"
  on public.leave_allowances
  using (
    (select private.is_manager_or_admin())
    and (user_id <> (select auth.uid()) or (select private.jwt_role()) = 'admin')
  );
