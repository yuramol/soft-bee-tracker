import { describe, expect, it } from 'vitest';

import {
  clampFinishedMinutes,
  formatStopwatch,
  formatTimerLabel,
  getLiveElapsedMinutes,
  getLiveElapsedSeconds,
  getLiveWholeMinutes,
  getMsUntilNextLiveMinute,
  isLiveTrackerActive
} from '@/lib/live-tracker';

const NOW = new Date('2026-11-05T12:00:00.000Z');

describe('getLiveElapsedSeconds', () => {
  it('adds the current run to banked minutes while running', () => {
    const tracker = { liveDurationMinutes: 10, liveStatus: 'start' as const, startLiveDate: '2026-11-05T11:58:30.000Z' };

    expect(getLiveElapsedSeconds(tracker, NOW)).toBe(10 * 60 + 90);
  });

  it('returns only banked minutes while paused', () => {
    const tracker = { liveDurationMinutes: 25, liveStatus: 'pause' as const, startLiveDate: null };

    expect(getLiveElapsedSeconds(tracker, NOW)).toBe(25 * 60);
  });

  it('ignores a start date in the future', () => {
    const tracker = { liveDurationMinutes: 5, liveStatus: 'start' as const, startLiveDate: '2026-11-05T12:05:00.000Z' };

    expect(getLiveElapsedSeconds(tracker, NOW)).toBe(5 * 60);
  });
});

describe('getLiveElapsedMinutes', () => {
  it('rounds to the nearest minute', () => {
    const tracker = { liveDurationMinutes: 0, liveStatus: 'start' as const, startLiveDate: '2026-11-05T11:58:30.000Z' };

    expect(getLiveElapsedMinutes(tracker, NOW)).toBe(2);
  });
});

describe('getLiveWholeMinutes', () => {
  it('floors the elapsed time so a pause never credits untracked seconds', () => {
    const tracker = { liveDurationMinutes: 0, liveStatus: 'start' as const, startLiveDate: '2026-11-05T11:58:30.000Z' };

    expect(getLiveWholeMinutes(tracker, NOW)).toBe(1);
  });

  it('adds nothing for a run shorter than a minute', () => {
    const tracker = { liveDurationMinutes: 3, liveStatus: 'start' as const, startLiveDate: '2026-11-05T11:59:31.000Z' };

    expect(getLiveWholeMinutes(tracker, NOW)).toBe(3);
  });

  it('keeps banked minutes unchanged while paused', () => {
    const tracker = { liveDurationMinutes: 25, liveStatus: 'pause' as const, startLiveDate: null };

    expect(getLiveWholeMinutes(tracker, NOW)).toBe(25);
  });
});

describe('getMsUntilNextLiveMinute', () => {
  it('counts down to the next whole minute measured from the timer start', () => {
    expect(getMsUntilNextLiveMinute('2026-11-05T11:58:30.000Z', NOW)).toBe(30_000);
    expect(getMsUntilNextLiveMinute('2026-11-05T11:59:59.250Z', NOW)).toBe(59_250);
  });

  it('waits a full minute when the timer sits exactly on a boundary', () => {
    expect(getMsUntilNextLiveMinute('2026-11-05T11:58:00.000Z', NOW)).toBe(60_000);
  });

  it('waits for the first minute after a start date in the future', () => {
    expect(getMsUntilNextLiveMinute('2026-11-05T12:00:10.000Z', NOW)).toBe(70_000);
  });
});

describe('formatStopwatch', () => {
  it('formats seconds as HH:mm:ss', () => {
    expect(formatStopwatch(0)).toBe('00:00:00');
    expect(formatStopwatch(3725)).toBe('01:02:05');
  });
});

describe('formatTimerLabel', () => {
  it('formats seconds as padded hours and minutes', () => {
    expect(formatTimerLabel(0)).toBe('00h 00m');
    expect(formatTimerLabel(3725)).toBe('01h 02m');
  });
});

describe('clampFinishedMinutes', () => {
  it('keeps the duration between one minute and 24 hours', () => {
    expect(clampFinishedMinutes(0)).toBe(1);
    expect(clampFinishedMinutes(90)).toBe(90);
    expect(clampFinishedMinutes(2000)).toBe(1440);
  });
});

describe('isLiveTrackerActive', () => {
  it('is active only for running or paused live entries', () => {
    expect(isLiveTrackerActive({ isLive: true, liveStatus: 'start' })).toBe(true);
    expect(isLiveTrackerActive({ isLive: true, liveStatus: 'pause' })).toBe(true);
    expect(isLiveTrackerActive({ isLive: true, liveStatus: 'finish' })).toBe(false);
    expect(isLiveTrackerActive({ isLive: false, liveStatus: null })).toBe(false);
  });
});
