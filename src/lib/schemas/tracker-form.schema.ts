import { format } from 'date-fns';
import { z } from 'zod';

import type { CreateTrackerInput } from '@/lib/api/trackers';

export const trackerFormSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date'),
  durationMinutes: z.number().int('Duration must be a whole number').positive('Duration must be greater than zero'),
  description: z.string()
});

export type TrackerFormValues = z.infer<typeof trackerFormSchema>;

export function createTrackerFormDefaults(): TrackerFormValues {
  return {
    projectId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    durationMinutes: 60,
    description: ''
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
