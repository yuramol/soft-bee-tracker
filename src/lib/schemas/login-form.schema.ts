import { z } from 'zod';

import { passwordSchema } from '@/lib/schemas/password.schema';

export const loginFormSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: passwordSchema
});

export interface LoginFormValues {
  email: string;
  password: string;
}
