import { format } from 'date-fns';
import { z } from 'zod';

import type { CreateTrackerInput, Tracker } from '@/lib/api/trackers';
import { MAX_DURATION_MINUTES } from '@/lib/format-duration';
import { clampFinishedMinutes, getLiveElapsedMinutes } from '@/lib/live-tracker';
import { isEntryDateOpen } from '@/lib/work-time-policy';
import content from './content.json';

export const trackerFormSchema = z.object({
  projectId: z.string().min(1, content.tracker.projectRequired),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, content.tracker.invalidDate)
    .refine((date) => isEntryDateOpen(date, new Date()), content.tracker.dateClosed),
  durationMinutes: z
    .number({ error: content.tracker.durationFormat })
    .int(content.tracker.durationWhole)
    .positive(content.tracker.durationPositive)
    .max(MAX_DURATION_MINUTES, content.tracker.durationMax),
  description: z.string()
});

export type TrackerFormValues = z.infer<typeof trackerFormSchema>;

export function createTrackerFormDefaults(date?: string): TrackerFormValues {
  return {
    projectId: '',
    date: date ?? format(new Date(), 'yyyy-MM-dd'),
    durationMinutes: 60,
    description: ''
  };
}

export function liveTrackerToFormValues(tracker: Tracker, now: Date): TrackerFormValues {
  return {
    projectId: tracker.projectId,
    date: tracker.date,
    durationMinutes: clampFinishedMinutes(getLiveElapsedMinutes(tracker, now)),
    description: tracker.description ?? ''
  };
}

export function trackerToFormValues(tracker: Tracker): TrackerFormValues {
  return {
    projectId: tracker.projectId,
    date: tracker.date,
    durationMinutes: tracker.durationMinutes,
    description: tracker.description ?? ''
  };
}

export function buildCreateTrackerInput(values: TrackerFormValues): CreateTrackerInput {
  return {
    projectId: values.projectId,
    date: values.date,
    description: values.description.trim() || null,
    durationMinutes: values.durationMinutes
  };
}
