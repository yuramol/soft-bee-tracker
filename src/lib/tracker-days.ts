import { eachDayOfInterval, endOfWeek, format, startOfWeek } from 'date-fns';

import type { Tracker } from '@/lib/api/trackers/types';
import { getLiveWholeMinutes, isLiveTrackerActive } from '@/lib/live-tracker';

export const DATE_KEY_FORMAT = 'yyyy-MM-dd';

export const DAILY_NORM_MINUTES = 5 * 60;

export function toDateKey(date: Date): string {
  return format(date, DATE_KEY_FORMAT);
}

export function getTrackerMinutes(tracker: Tracker, now: Date): number {
  return isLiveTrackerActive(tracker) ? getLiveWholeMinutes(tracker, now) : tracker.durationMinutes;
}

export function sumMinutesByDate(trackers: Tracker[], now: Date): Map<string, number> {
  const totals = new Map<string, number>();

  for (const tracker of trackers) {
    if (tracker.status === 'rejected') {
      continue;
    }

    totals.set(tracker.date, (totals.get(tracker.date) ?? 0) + getTrackerMinutes(tracker, now));
  }

  return totals;
}

export function getWeekDays(date: Date): Date[] {
  return eachDayOfInterval({ start: startOfWeek(date, { weekStartsOn: 1 }), end: endOfWeek(date, { weekStartsOn: 1 }) });
}
