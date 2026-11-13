import { describe, expect, it } from 'vitest';

import type { CrewLeaveRequest, CrewMember } from '@/lib/api/crew';
import {
  computeMemberLeaveBalances,
  countPendingLeave,
  DEFAULT_CREW_FILTERS,
  filterMembers,
  getCrewPermissions,
  getMemberProfileHref,
  getPositions,
  getVisibleLeaveRequests,
  getVisibleMembers,
  summarizeTeamTime,
  toSafeExternalUrl
} from '@/lib/crew';

function member(overrides: Partial<CrewMember>): CrewMember {
  return {
    id: 'm1',
    firstName: 'Iryna',
    lastName: 'Shevchenko',
    username: 'iryna',
    email: 'iryna@softbee.dev',
    avatarUrl: null,
    role: 'worker',
    position: 'Frontend engineer',
    status: 'active',
    phone: null,
    linkedin: null,
    upwork: null,
    employmentDate: null,
    managerIds: ['boss'],
    projects: [],
    weekMinutesByProject: {},
    monthMinutes: 0,
    ...overrides
  };
}

function leave(overrides: Partial<CrewLeaveRequest>): CrewLeaveRequest {
  return {
    id: 'l1',
    memberId: 'm1',
    leaveType: 'vacation',
    startDate: '2026-11-23',
    endDate: '2026-11-24',
    note: null,
    status: 'pending',
    ...overrides
  };
}

const CREW = [
  member({ id: 'm1' }),
  member({ id: 'm2', firstName: 'Taras', email: 'taras@softbee.dev', position: 'Backend engineer', status: 'blocked' }),
  member({ id: 'm3', managerIds: ['other'], role: 'manager', position: 'Project manager', status: 'pending' })
];

describe('getVisibleMembers', () => {
  it('shows everyone to an admin', () => {
    expect(getVisibleMembers(CREW, { id: 'x', role: 'admin' })).toHaveLength(3);
  });

  it('shows everyone to a manager', () => {
    expect(getVisibleMembers(CREW, { id: 'boss', role: 'manager' }).map((item) => item.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('limits staff to themselves', () => {
    expect(getVisibleMembers(CREW, { id: 'm2', role: 'worker' }).map((item) => item.id)).toEqual(['m2']);
  });
});

describe('getCrewPermissions', () => {
  it('lets only admins invite and manage members', () => {
    expect(getCrewPermissions('admin')).toMatchObject({ canInvite: true, canManageMembers: true });
    expect(getCrewPermissions('manager')).toMatchObject({ canInvite: false, canManageMembers: false, canReviewLeave: true });
    expect(getCrewPermissions('worker').canViewCrew).toBe(false);
  });
});

describe('filterMembers', () => {
  it('matches name or email case-insensitively', () => {
    expect(filterMembers(CREW, { ...DEFAULT_CREW_FILTERS, query: ' TARAS ' }).map((item) => item.id)).toEqual(['m2']);
    expect(filterMembers(CREW, { ...DEFAULT_CREW_FILTERS, query: 'iryna@' }).map((item) => item.id)).toEqual(['m1', 'm3']);
  });

  it('combines role, position and status filters', () => {
    expect(filterMembers(CREW, { ...DEFAULT_CREW_FILTERS, role: 'worker', status: 'blocked' }).map((item) => item.id)).toEqual(['m2']);
    expect(filterMembers(CREW, { ...DEFAULT_CREW_FILTERS, position: 'Project manager' }).map((item) => item.id)).toEqual(['m3']);
  });
});

describe('getPositions', () => {
  it('returns unique positions sorted alphabetically', () => {
    expect(getPositions([...CREW, member({ id: 'm4' })])).toEqual(['Backend engineer', 'Frontend engineer', 'Project manager']);
  });

  it('skips people without a position', () => {
    expect(getPositions([member({ id: 'm5', position: null })])).toEqual([]);
  });
});

describe('summarizeTeamTime', () => {
  it('sums minutes per project and drops empty ones', () => {
    const summary = summarizeTeamTime([
      member({ weekMinutesByProject: { Atlas: 600, Nova: 0 } }),
      member({ id: 'm2', weekMinutesByProject: { Atlas: 360, Helios: 480 } })
    ]);

    expect(summary).toEqual({
      projects: [
        { project: 'Atlas', minutes: 960 },
        { project: 'Helios', minutes: 480 }
      ],
      totalMinutes: 1440
    });
  });

  it('returns zero for an empty team', () => {
    expect(summarizeTeamTime([])).toEqual({ projects: [], totalMinutes: 0 });
  });
});

describe('leave requests', () => {
  it('keeps only requests of visible members, earliest first, and counts pending', () => {
    const requests = getVisibleLeaveRequests(
      [
        leave({ id: 'l1', startDate: '2026-12-01' }),
        leave({ id: 'l2', memberId: 'hidden' }),
        leave({ id: 'l3', startDate: '2026-11-20', status: 'approved' })
      ],
      [member({})]
    );

    expect(requests.map((item) => item.id)).toEqual(['l3', 'l1']);
    expect(countPendingLeave(requests)).toBe(1);
  });
});

describe('getMemberProfileHref', () => {
  it('builds the member profile route', () => {
    expect(getMemberProfileHref('u3')).toBe('/profile/u3');
  });
});

describe('toSafeExternalUrl', () => {
  it('keeps http and https links', () => {
    expect(toSafeExternalUrl(' https://www.linkedin.com/in/iryna ')).toBe('https://www.linkedin.com/in/iryna');
  });

  it('drops empty, malformed and script links', () => {
    expect(toSafeExternalUrl(null)).toBeNull();
    expect(toSafeExternalUrl('linkedin.com/in/iryna')).toBeNull();
    expect(toSafeExternalUrl('javascript:alert(1)')).toBeNull();
  });
});

describe('computeMemberLeaveBalances', () => {
  it('counts approved working days against the allowance', () => {
    const balances = computeMemberLeaveBalances(
      [leave({ status: 'approved' }), leave({ id: 'l2', leaveType: 'sick_leave', startDate: '2026-11-12', endDate: '2026-11-12' })],
      [
        { id: 'a1', year: 2026, leaveType: 'vacation', days: 25 },
        { id: 'a2', year: 2026, leaveType: 'sick_leave', days: 5 }
      ],
      2026
    );

    expect(balances.vacation).toMatchObject({ allowanceDays: 25, usedDays: 2 });
    expect(balances.sick_leave).toMatchObject({ allowanceDays: 5, usedDays: 0, pendingDays: 1 });
  });
});
