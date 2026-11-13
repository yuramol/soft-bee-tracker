import { describe, expect, it } from 'vitest';

import type { UserRole } from '@/lib/api/auth/types';
import { canInviteRole, getInvitableRoles } from '@/lib/api/invites/permissions';

describe('getInvitableRoles', () => {
  it.each<[UserRole | null, readonly UserRole[]]>([
    ['admin', ['worker', 'manager', 'admin']],
    ['manager', ['worker']],
    ['worker', []],
    [null, []]
  ])('%s may invite %j', (inviter, expected) => {
    expect(getInvitableRoles(inviter)).toEqual(expected);
  });
});

describe('canInviteRole', () => {
  it('stops a manager from creating a manager or an admin', () => {
    expect(canInviteRole('manager', 'worker')).toBe(true);
    expect(canInviteRole('manager', 'manager')).toBe(false);
    expect(canInviteRole('manager', 'admin')).toBe(false);
  });

  it('fails closed without a role', () => {
    expect(canInviteRole(null, 'worker')).toBe(false);
  });
});
