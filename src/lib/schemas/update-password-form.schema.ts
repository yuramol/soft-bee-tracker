import { z } from 'zod';

import { passwordSchema } from '@/lib/schemas/password.schema';

export const updatePasswordFormSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password')
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export interface UpdatePasswordFormValues {
  password: string;
  confirmPassword: string;
}
