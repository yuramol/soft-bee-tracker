import { z } from 'zod';

import { passwordSchema } from '@/lib/schemas/password.schema';
import content from './content.json';

// the new password reuses passwordSchema so login, register and change share one rule set
export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, content.password.currentRequired),
    password: passwordSchema,
    confirmPassword: z.string().min(1, content.password.confirmRequired)
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: content.password.mismatch,
    path: ['confirmPassword']
  })
  .refine((values) => values.password !== values.currentPassword, {
    message: content.password.sameAsCurrent,
    path: ['password']
  });

export interface ChangePasswordFormValues {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}
