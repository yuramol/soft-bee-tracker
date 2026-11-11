import { eachDayOfInterval, endOfMonth, endOfWeek, format, isWeekend, startOfMonth, startOfWeek } from 'date-fns';

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

export function buildTrackerSummary(trackers: Tracker[], now: Date): TrackerSummary {
  const minutesByDate = sumMinutesByDate(trackers, now);
  const week = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  const month = { start: startOfMonth(now), end: endOfMonth(now) };

  return {
    todayMinutes: minutesByDate.get(toDateKey(now)) ?? 0,
    weekMinutes: sumMinutesInRange(minutesByDate, week),
    weekNormMinutes: countWorkingDays(week) * DAILY_NORM_MINUTES,
    monthMinutes: sumMinutesInRange(minutesByDate, month),
    monthNormMinutes: countWorkingDays(month) * DAILY_NORM_MINUTES
  };
}

// date keys are yyyy-MM-dd, so string comparison matches chronological order
function sumMinutesInRange(minutesByDate: Map<string, number>, range: DateRange): number {
  const startKey = toDateKey(range.start);
  const endKey = toDateKey(range.end);
  let total = 0;

  for (const [dateKey, minutes] of minutesByDate) {
    if (dateKey >= startKey && dateKey <= endKey) {
      total += minutes;
    }
  }

  return total;
}

function countWorkingDays(range: DateRange): number {
  return eachDayOfInterval(range).filter((day) => !isWeekend(day)).length;
}

interface DateRange {
  start: Date;
  end: Date;
}

export interface TrackerSummary {
  todayMinutes: number;
  weekMinutes: number;
  weekNormMinutes: number;
  monthMinutes: number;
  monthNormMinutes: number;
}
