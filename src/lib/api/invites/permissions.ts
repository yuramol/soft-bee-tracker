import type { UserRole } from '@/lib/api/auth/types';

// who may invite, and with which role. the inviter's role always comes from the
// verified user_role claim (getRouteSession), never from the form. the server
// action enforces this; the dialog only uses it to hide options.
export function getInvitableRoles(inviterRole: UserRole | null): readonly UserRole[] {
  return inviterRole ? INVITABLE_ROLES_BY_INVITER[inviterRole] : [];
}

export function canInviteRole(inviterRole: UserRole | null, role: UserRole): boolean {
  return getInvitableRoles(inviterRole).includes(role);
}

// admins invite any role; managers only workers, so a manager can't create an
// admin or another manager; workers can't invite
const INVITABLE_ROLES_BY_INVITER: Record<UserRole, readonly UserRole[]> = {
  admin: ['worker', 'manager', 'admin'],
  manager: ['worker'],
  worker: []
};
