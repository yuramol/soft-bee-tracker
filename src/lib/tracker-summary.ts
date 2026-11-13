import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from 'date-fns';

import type { Tracker } from '@/lib/api/trackers/types';
import { getTrackerMinutes, toDateKey } from '@/lib/tracker-days';

export function getPeriodRange(date: Date, period: SummaryPeriod): DateKeyRange {
  if (period === 'day') {
    const key = toDateKey(date);

    return { start: key, end: key };
  }

  if (period === 'week') {
    return { start: toDateKey(startOfWeek(date, { weekStartsOn: 1 })), end: toDateKey(endOfWeek(date, { weekStartsOn: 1 })) };
  }

  return { start: toDateKey(startOfMonth(date)), end: toDateKey(endOfMonth(date)) };
}

export function isDateKeyInRange(dateKey: string, range: DateKeyRange): boolean {
  return dateKey >= range.start && dateKey <= range.end;
}

export function summarizeTrackersByProject(trackers: Tracker[], range: DateKeyRange, now: Date): ProjectSummary {
  const minutesByProject = new Map<string, number>();

  for (const tracker of trackers) {
    if (tracker.status === 'rejected' || !isDateKeyInRange(tracker.date, range)) {
      continue;
    }

    minutesByProject.set(tracker.projectId, (minutesByProject.get(tracker.projectId) ?? 0) + getTrackerMinutes(tracker, now));
  }

  const projects = [...minutesByProject.entries()]
    .map(([projectId, minutes]) => ({ projectId, minutes }))
    .filter((item) => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);

  return {
    projects,
    totalMinutes: projects.reduce((sum, item) => sum + item.minutes, 0)
  };
}

export type SummaryPeriod = 'day' | 'week' | 'month';

export interface DateKeyRange {
  start: string;
  end: string;
}

export interface ProjectSummary {
  projects: Array<{ projectId: string; minutes: number }>;
  totalMinutes: number;
}
