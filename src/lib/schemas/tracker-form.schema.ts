import { z } from 'zod';

export interface TrackerFormValues {
  projectId: string;
  date: string;
  durationMinutes: number;
  description: string;
}

export const trackerFormSchema = z.object({
  projectId: z.string().min(1, 'Project is required'),
  date: z.iso.date('Enter a valid date'),
  durationMinutes: z.number().int('Duration must be a whole number').positive('Duration must be greater than zero'),
  description: z.string()
}) satisfies z.ZodType<TrackerFormValues>;
