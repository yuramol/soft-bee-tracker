import { describe, expect, it } from 'vitest';

import type { Tracker } from '@/lib/api/trackers/types';
import { buildCrew, getCrewStatus, getCrewTrackerStartDate, mapPositionToJson, type CrewRows } from './mappers';

// thursday 12 november 2026: the week starts on monday 9 november, the month on the 1st
const NOW = new Date('2026-11-12T12:00:00');

function user(id: string, overrides: Partial<CrewRows['users'][number]> = {}): CrewRows['users'][number] {
  return {
    id,
    email: `${id}@softbee.dev`,
    username: id,
    first_name: id.toUpperCase(),
    last_name: 'Test',
    phone: null,
    linkedin: null,
    upwork: null,
    avatar_url: null,
    date_employment: null,
    positions: { titles: ['Engineer'] },
    user_access: { role: 'worker', is_confirmed: true, is_blocked: false },
    ...overrides
  };
}

function tracker(
  userId: string,
  projectId: string,
  date: string,
  durationMinutes: number,
  status: Tracker['status'] = 'approved'
): Tracker {
  return {
    id: `${userId}-${date}-${durationMinutes}`,
    createdAt: '',
    updatedAt: '',
    date,
    description: null,
    durationMinutes,
    isLive: false,
    liveDurationMinutes: 0,
    liveStatus: null,
    status,
    startLiveDate: null,
    projectId,
    userId,
    transactionId: null
  };
}

const ROWS: CrewRows = {
  users: [
    user('ann'),
    user('bob', { positions: null, user_access: { role: 'manager', is_confirmed: true, is_blocked: false } }),
    user('ghost', { user_access: null })
  ],
  projects: [
    { id: 'p1', name: 'Atlas', status: 'active', manager_id: 'bob' },
    { id: 'p2', name: 'Old', status: 'archived', manager_id: 'bob' }
  ],
  projectRates: [
    { project_id: 'p1', user_id: 'ann' },
    { project_id: 'p2', user_id: 'ann' }
  ],
  trackers: [
    tracker('ann', 'p1', '2026-11-10', 120),
    tracker('ann', 'p1', '2026-11-12', 60),
    tracker('ann', 'p1', '2026-11-03', 300),
    tracker('ann', 'p1', '2026-11-11', 999, 'rejected')
  ],
  leaveRequests: [
    { id: 'l1', user_id: 'ann', leave_type: 'vacation', start_date: '2026-12-07', end_date: '2026-12-11', note: null, status: 'pending' }
  ],
  allowances: [{ id: 'a1', user_id: 'ann', year: 2026, leave_type: 'vacation', days: 20 }]
};

describe('buildCrew', () => {
  const crew = buildCrew(ROWS, NOW);
  const ann = crew.members.find((member) => member.id === 'ann');
  const bob = crew.members.find((member) => member.id === 'bob');

  it('leaves out people without an access row', () => {
    expect(crew.members.map((member) => member.id)).toEqual(['ann', 'bob']);
  });

  it('lists only active projects and their managers', () => {
    expect(ann?.projects).toEqual(['Atlas']);
    expect(ann?.managerIds).toEqual(['bob']);
  });

  it('counts a project manager on their own project but not as their own manager', () => {
    expect(bob?.projects).toEqual(['Atlas']);
    expect(bob?.managerIds).toEqual([]);
  });

  it('sums this week by project and this month in total, skipping rejected time', () => {
    expect(ann?.weekMinutesByProject).toEqual({ Atlas: 180 });
    expect(ann?.monthMinutes).toBe(480);
  });

  it('reads the position from the titles list and allows none', () => {
    expect(ann?.position).toBe('Engineer');
    expect(bob?.position).toBeNull();
  });

  it('maps leave requests and allowances to the member they belong to', () => {
    expect(crew.leaveRequests[0]).toMatchObject({ id: 'l1', memberId: 'ann', status: 'pending' });
    expect(crew.allowances[0]).toMatchObject({ memberId: 'ann', days: 20 });
  });

  it('keeps who is on each project for the leave coverage check', () => {
    expect(crew.projects.find((project) => project.id === 'p1')?.memberIds).toEqual(['ann']);
  });
});

describe('getCrewStatus', () => {
  it.each([
    [{ is_blocked: true, is_confirmed: true }, 'blocked'],
    [{ is_blocked: false, is_confirmed: false }, 'pending'],
    [{ is_blocked: false, is_confirmed: true }, 'active']
  ] as const)('maps %o to %s', (access, status) => {
    expect(getCrewStatus(access)).toBe(status);
  });
});

describe('getCrewTrackerStartDate', () => {
  it('uses the month start when the week started this month', () => {
    expect(getCrewTrackerStartDate(NOW)).toBe('2026-11-01');
  });

  it('uses the week start when the week began last month', () => {
    expect(getCrewTrackerStartDate(new Date('2026-12-02T12:00:00'))).toBe('2026-11-30');
  });
});

describe('mapPositionToJson', () => {
  it('stores one trimmed title and clears an empty one', () => {
    expect(mapPositionToJson('  QA engineer ')).toEqual({ titles: ['QA engineer'] });
    expect(mapPositionToJson('   ')).toBeNull();
  });
});
