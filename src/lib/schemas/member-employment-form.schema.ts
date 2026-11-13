import { format } from 'date-fns';
import { z } from 'zod';

import content from './content.json';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const memberPositionFormSchema = z.object({
  position: z.string().trim().min(1, content.employment.positionRequired).max(100, content.employment.positionTooLong)
});

export const memberEmploymentDateFormSchema = z.object({
  employmentDate: z
    .string()
    .regex(DATE_PATTERN, content.employment.invalidDate)
    .refine((value) => value <= format(new Date(), 'yyyy-MM-dd'), content.employment.dateInFuture)
    .or(z.literal(''))
});

export interface MemberPositionFormValues {
  position: string;
}

export interface MemberEmploymentDateFormValues {
  employmentDate: string;
}
