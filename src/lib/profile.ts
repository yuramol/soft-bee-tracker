import type { UserProfile, UserStatus } from '@/lib/api/auth';
import type { MemberProject } from '@/lib/api/projects';

export function getProfileDisplayName(profile: Pick<UserProfile, 'firstName' | 'lastName' | 'username'>): string {
  return `${profile.firstName} ${profile.lastName}`.trim() || profile.username;
}

export function getProfileStatus(profile: Pick<UserProfile, 'isBlocked' | 'isConfirmed'>): UserStatus {
  if (profile.isBlocked) {
    return 'blocked';
  }

  return profile.isConfirmed ? 'active' : 'pending';
}

export function getProfilePosition(profile: Pick<UserProfile, 'positions'>): string | null {
  const titles = profile.positions?.titles.map((title) => title.trim()).filter(Boolean) ?? [];

  return titles.length > 0 ? titles.join(', ') : null;
}

// admins edit any project; managers only the ones they run (mirrors who the Projects page lets act)
export function canEditMemberProject(profile: Pick<UserProfile, 'role'>, memberProject: MemberProject): boolean {
  return profile.role === 'admin' || (profile.role === 'manager' && memberProject.membership === 'manager');
}
