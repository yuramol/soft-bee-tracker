import { describe, expect, it } from 'vitest';

import type { Tracker } from '@/lib/api/trackers/types';
import { buildTrackerSummary, DAILY_NORM_MINUTES, getWeekDays, sumMinutesByDate, toDateKey } from '@/lib/tracker-days';

const NOW = new Date('2026-11-05T12:00:00.000Z');

function buildTracker(overrides: Partial<Tracker>): Tracker {
  return {
    id: 't',
    createdAt: '',
    updatedAt: '',
    date: '2026-11-05',
    description: null,
    durationMinutes: 0,
    isLive: false,
    liveDurationMinutes: 0,
    liveStatus: null,
    status: 'new',
    startLiveDate: null,
    projectId: 'p',
    userId: 'u',
    transactionId: null,
    ...overrides
  };
}

describe('sumMinutesByDate', () => {
  it('sums saved durations per day and counts a running timer by elapsed time', () => {
    const totals = sumMinutesByDate(
      [
        buildTracker({ durationMinutes: 60 }),
        buildTracker({ durationMinutes: 30 }),
        buildTracker({ date: '2026-11-04', durationMinutes: 45 }),
        buildTracker({ isLive: true, liveStatus: 'start', liveDurationMinutes: 10, startLiveDate: '2026-11-05T11:50:00.000Z' })
      ],
      NOW
    );

    expect(totals.get('2026-11-05')).toBe(60 + 30 + 20);
    expect(totals.get('2026-11-04')).toBe(45);
  });

  it('combines saved, paused, running and rejected entries on the same day', () => {
    const totals = sumMinutesByDate(
      [
        buildTracker({ durationMinutes: 60, status: 'approved' }),
        buildTracker({ durationMinutes: 120, status: 'rejected' }),
        buildTracker({ isLive: true, liveStatus: 'pause', liveDurationMinutes: 15, startLiveDate: null }),
        buildTracker({ isLive: true, liveStatus: 'start', liveDurationMinutes: 0, startLiveDate: '2026-11-05T11:52:01.000Z' }),
        buildTracker({ isLive: true, liveStatus: 'start', status: 'rejected', startLiveDate: '2026-11-05T11:00:00.000Z' })
      ],
      NOW
    );

    expect(totals.get('2026-11-05')).toBe(60 + 15 + 7);
  });

  it('uses the saved duration for a finished live entry', () => {
    const totals = sumMinutesByDate(
      [buildTracker({ isLive: true, liveStatus: 'finish', durationMinutes: 45, liveDurationMinutes: 50, startLiveDate: null })],
      NOW
    );

    expect(totals.get('2026-11-05')).toBe(45);
  });

  it('skips rejected entries', () => {
    const totals = sumMinutesByDate([buildTracker({ durationMinutes: 60, status: 'rejected' })], NOW);

    expect(totals.get('2026-11-05')).toBeUndefined();
  });
});

describe('getWeekDays', () => {
  it('returns Monday to Sunday around the date', () => {
    const days = getWeekDays(new Date(2026, 10, 5)).map(toDateKey);

    expect(days).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08']);
  });
});

describe('buildTrackerSummary', () => {
  // NOW is Thu 2026-11-05: week is 11-02..11-08, November 2026 has 21 working days
  it('buckets each entry into today, week and month by its date', () => {
    const summary = buildTrackerSummary(
      [
        buildTracker({ id: 'today', date: '2026-11-05', durationMinutes: 120 }),
        buildTracker({ id: 'week', date: '2026-11-02', durationMinutes: 60 }),
        buildTracker({ id: 'month', date: '2026-11-20', durationMinutes: 30 }),
        buildTracker({ id: 'other-month', date: '2026-10-30', durationMinutes: 500 }),
        buildTracker({ id: 'rejected', date: '2026-11-05', durationMinutes: 999, status: 'rejected' })
      ],
      NOW
    );

    expect(summary.todayMinutes).toBe(120);
    expect(summary.weekMinutes).toBe(180);
    expect(summary.monthMinutes).toBe(210);
  });

  it('derives norms from the working days of the current week and month', () => {
    const summary = buildTrackerSummary([], NOW);

    expect(summary.weekNormMinutes).toBe(5 * DAILY_NORM_MINUTES);
    expect(summary.monthNormMinutes).toBe(21 * DAILY_NORM_MINUTES);
    expect(summary.todayMinutes).toBe(0);
  });
});
