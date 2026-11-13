import { z } from 'zod';

import { passwordSchema } from '@/lib/schemas/password.schema';
import content from './content.json';

export const updatePasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, content.password.confirmRequired)
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: content.password.mismatch,
    path: ['confirmPassword']
  });

export interface UpdatePasswordFormValues {
  password: string;
  confirmPassword: string;
}
