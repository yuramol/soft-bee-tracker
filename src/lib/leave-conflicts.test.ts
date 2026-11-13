import { describe, expect, it } from 'vitest';

import { getLeaveConflicts } from '@/lib/leave-conflicts';
import type { CrewLeaveRequest } from '@/lib/api/crew';
import type { ProjectRecord } from '@/mocks/projects.mock';

describe('getLeaveConflicts', () => {
  it('lists colleagues away on the same project and days', () => {
    const conflicts = getLeaveConflicts(REQUEST, [REQUEST, leave('b', 'u2', '2026-11-25', '2026-11-27', 'approved')], PROJECTS, VISIBLE);

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ projectId: 'p1', uncoveredDays: [] });
    expect(conflicts[0].overlaps.map((overlap) => [overlap.request.id, overlap.days])).toEqual([['b', 3]]);
  });

  it('flags days when nobody else on the project is available', () => {
    const requests = [
      REQUEST,
      leave('b', 'u2', '2026-11-25', '2026-11-27', 'approved'),
      leave('c', 'u3', '2026-11-26', '2026-11-30', 'pending')
    ];

    expect(getLeaveConflicts(REQUEST, requests, PROJECTS, VISIBLE)[0].uncoveredDays).toEqual(['2026-11-26', '2026-11-27']);
  });

  it('ignores rejected and cancelled requests and other projects', () => {
    const requests = [
      REQUEST,
      leave('b', 'u2', '2026-11-25', '2026-11-27', 'rejected'),
      leave('c', 'u3', '2026-11-25', '2026-11-27', 'cancelled'),
      leave('d', 'u9', '2026-11-25', '2026-11-27', 'approved')
    ];

    expect(getLeaveConflicts(REQUEST, requests, PROJECTS, VISIBLE)).toEqual([]);
  });

  it('ignores weekends and archived projects', () => {
    const weekend = leave('b', 'u2', '2026-11-28', '2026-11-29', 'approved');
    const archived = [{ ...PROJECTS[0], status: 'archived' as const }];

    expect(getLeaveConflicts(REQUEST, [REQUEST, weekend], PROJECTS, VISIBLE)).toEqual([]);
    expect(getLeaveConflicts(REQUEST, [REQUEST, leave('c', 'u2', '2026-11-25', '2026-11-25', 'approved')], archived, VISIBLE)).toEqual([]);
  });

  it('does not name people the viewer cannot see but still counts them for coverage', () => {
    const requests = [
      REQUEST,
      leave('b', 'u2', '2026-11-25', '2026-11-27', 'approved'),
      leave('c', 'u3', '2026-11-26', '2026-11-30', 'pending')
    ];
    const conflicts = getLeaveConflicts(REQUEST, requests, PROJECTS, new Set(['u1', 'u2']));

    expect(conflicts[0].overlaps.map((overlap) => overlap.request.id)).toEqual(['b']);
    expect(conflicts[0].uncoveredDays).toEqual(['2026-11-26', '2026-11-27']);
  });

  it('keeps an uncovered project even when nobody away is visible', () => {
    const requests = [
      REQUEST,
      leave('b', 'u2', '2026-11-25', '2026-11-27', 'approved'),
      leave('c', 'u3', '2026-11-25', '2026-11-27', 'approved')
    ];
    const conflicts = getLeaveConflicts(REQUEST, requests, PROJECTS, new Set(['u1']));

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]).toMatchObject({ overlaps: [], uncoveredDays: ['2026-11-25', '2026-11-26', '2026-11-27'] });
  });
});

function leave(id: string, memberId: string, startDate: string, endDate: string, status: CrewLeaveRequest['status']): CrewLeaveRequest {
  return { id, memberId, leaveType: 'vacation', startDate, endDate, note: null, status };
}

function project(id: string, memberIds: string[]): ProjectRecord {
  return {
    id,
    name: id,
    description: '',
    managerId: memberIds[0],
    status: 'active',
    memberIds,
    links: [],
    weekMinutesByMember: {},
    version: 1
  };
}

const REQUEST = leave('a', 'u1', '2026-11-23', '2026-11-27', 'pending');

const VISIBLE = new Set(['u1', 'u2', 'u3', 'u9']);

const PROJECTS = [project('p1', ['u1', 'u2', 'u3']), project('p2', ['u9'])];
