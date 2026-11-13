import { describe, expect, it, vi } from 'vitest';

import type { MemberProject, Project } from '@/lib/api/projects';
import { toMemberProjects } from '@/lib/api/projects/queries';
import { canEditMemberProject, getProfileDisplayName, getProfilePosition, getProfileStatus } from '@/lib/profile';

vi.mock('@/lib/supabase/client', () => ({ createBrowserClient: vi.fn() }));

function buildProject(overrides: Partial<Project>): Project {
  return {
    id: 'p1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    name: 'Atlas',
    client: 'Acme',
    note: null,
    pictureUrl: null,
    startDate: null,
    endDate: null,
    status: 'active',
    type: 'time_material',
    managerId: null,
    links: [],
    ...overrides
  };
}

describe('getProfileDisplayName', () => {
  it('prefers the full name and falls back to the username', () => {
    expect(getProfileDisplayName({ firstName: 'Mykola', lastName: 'Bobryk', username: 'mb' })).toBe('Mykola Bobryk');
    expect(getProfileDisplayName({ firstName: ' ', lastName: '', username: 'mb' })).toBe('mb');
  });
});

describe('getProfileStatus', () => {
  it('treats blocked as stronger than confirmation', () => {
    expect(getProfileStatus({ isBlocked: true, isConfirmed: true })).toBe('blocked');
    expect(getProfileStatus({ isBlocked: false, isConfirmed: false })).toBe('pending');
    expect(getProfileStatus({ isBlocked: false, isConfirmed: true })).toBe('active');
  });
});

describe('getProfilePosition', () => {
  it('joins non-empty titles and returns null when none are set', () => {
    expect(getProfilePosition({ positions: { titles: ['Developer', ' ', 'QA'] } })).toBe('Developer, QA');
    expect(getProfilePosition({ positions: { titles: [] } })).toBeNull();
    expect(getProfilePosition({ positions: null })).toBeNull();
  });
});

describe('canEditMemberProject', () => {
  const managed: MemberProject = { project: buildProject({}), membership: 'manager' };
  const assigned: MemberProject = { project: buildProject({}), membership: 'member' };

  it('lets admins edit any project and managers only their own', () => {
    expect(canEditMemberProject({ role: 'admin' }, assigned)).toBe(true);
    expect(canEditMemberProject({ role: 'manager' }, managed)).toBe(true);
    expect(canEditMemberProject({ role: 'manager' }, assigned)).toBe(false);
    expect(canEditMemberProject({ role: 'worker' }, managed)).toBe(false);
  });
});

describe('toMemberProjects', () => {
  it('marks managed projects and lists active ones first, then by name', () => {
    const result = toMemberProjects(
      [
        buildProject({ id: 'a', name: 'Zeta', status: 'archived' }),
        buildProject({ id: 'b', name: 'Beta', managerId: 'me' }),
        buildProject({ id: 'c', name: 'Alpha' })
      ],
      'me'
    );

    expect(result.map((item) => [item.project.id, item.membership])).toEqual([
      ['c', 'member'],
      ['b', 'manager'],
      ['a', 'member']
    ]);
  });
});
