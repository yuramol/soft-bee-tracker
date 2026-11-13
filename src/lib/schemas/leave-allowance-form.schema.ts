import { z } from 'zod';

import content from './content.json';

// matches the leave_allowances_days_range check in the database
export const leaveAllowanceFormSchema = z.object({
  days: z
    .number({ error: content.leave.allowanceInvalid })
    .int(content.leave.allowanceInvalid)
    .min(0, content.leave.allowanceInvalid)
    .max(366, content.leave.allowanceInvalid)
});

export interface LeaveAllowanceFormValues {
  days: number;
}
