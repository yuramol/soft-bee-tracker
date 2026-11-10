import { describe, expect, it } from 'vitest';

import type { Tracker } from '@/lib/api/trackers/types';
import { getPeriodRange, summarizeTrackersByProject } from '@/lib/tracker-summary';

function tracker(overrides: Partial<Tracker>): Tracker {
  return {
    id: 't1',
    createdAt: '2026-11-09T08:00:00Z',
    updatedAt: '2026-11-09T08:00:00Z',
    date: '2026-11-09',
    description: null,
    durationMinutes: 60,
    isLive: false,
    liveDurationMinutes: 0,
    liveStatus: null,
    status: 'new',
    startLiveDate: null,
    projectId: 'p1',
    userId: 'u1',
    transactionId: null,
    ...overrides
  };
}

const NOW = new Date('2026-11-10T12:00:00');

describe('getPeriodRange', () => {
  const date = new Date('2026-11-11T10:00:00');

  it('returns the day itself', () => {
    expect(getPeriodRange(date, 'day')).toEqual({ start: '2026-11-11', end: '2026-11-11' });
  });

  it('returns a Monday-to-Sunday week', () => {
    expect(getPeriodRange(date, 'week')).toEqual({ start: '2026-11-09', end: '2026-11-15' });
  });

  it('returns the calendar month', () => {
    expect(getPeriodRange(date, 'month')).toEqual({ start: '2026-11-01', end: '2026-11-30' });
  });
});

describe('summarizeTrackersByProject', () => {
  it('groups minutes by project inside the range, sorted by time', () => {
    const summary = summarizeTrackersByProject(
      [
        tracker({ projectId: 'p1', durationMinutes: 150 }),
        tracker({ id: 't2', projectId: 'p2', durationMinutes: 180 }),
        tracker({ id: 't3', projectId: 'p1', durationMinutes: 30, date: '2026-11-10' }),
        tracker({ id: 't4', projectId: 'p1', durationMinutes: 999, date: '2026-11-20' })
      ],
      { start: '2026-11-09', end: '2026-11-15' },
      NOW
    );

    expect(summary).toEqual({
      projects: [
        { projectId: 'p1', minutes: 180 },
        { projectId: 'p2', minutes: 180 }
      ],
      totalMinutes: 360
    });
  });

  it('excludes rejected entries', () => {
    const summary = summarizeTrackersByProject([tracker({ status: 'rejected' })], { start: '2026-11-09', end: '2026-11-09' }, NOW);

    expect(summary).toEqual({ projects: [], totalMinutes: 0 });
  });
});
