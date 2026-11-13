import { z } from 'zod';

import type { StartLiveTrackerInput } from '@/lib/api/trackers';
import content from './content.json';

export const liveTrackerFormSchema = z.object({
  projectId: z.string().min(1, content.tracker.projectRequired),
  description: z.string().max(500, content.tracker.descriptionTooLong)
});

export type LiveTrackerFormValues = z.infer<typeof liveTrackerFormSchema>;

export const LIVE_TRACKER_FORM_DEFAULTS: LiveTrackerFormValues = {
  projectId: '',
  description: ''
};

export function buildStartLiveTrackerInput(values: LiveTrackerFormValues): StartLiveTrackerInput {
  return {
    projectId: values.projectId,
    description: values.description.trim() || null
  };
}
