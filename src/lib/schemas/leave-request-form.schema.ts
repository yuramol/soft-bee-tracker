import { format } from 'date-fns';
import { z } from 'zod';

import content from './content.json';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const leaveRequestFormSchema = z
  .object({
    leaveType: z.enum(['vacation', 'sick_leave'], { error: content.leave.typeRequired }),
    startDate: z.string().regex(DATE_PATTERN, content.leave.invalidDate),
    endDate: z.string().regex(DATE_PATTERN, content.leave.invalidDate),
    note: z.string().max(500, content.leave.noteTooLong)
  })
  .refine((values) => values.endDate >= values.startDate, { message: content.leave.endBeforeStart, path: ['endDate'] });

export type LeaveRequestFormValues = z.infer<typeof leaveRequestFormSchema>;

export function createLeaveRequestFormDefaults(date?: string): LeaveRequestFormValues {
  const day = date ?? format(new Date(), 'yyyy-MM-dd');

  return { leaveType: 'vacation', startDate: day, endDate: day, note: '' };
}
