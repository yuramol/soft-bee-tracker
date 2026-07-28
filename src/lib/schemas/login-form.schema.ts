import { z } from 'zod';

import { emailSchema } from '@/lib/schemas/email.schema';
import { passwordSchema } from '@/lib/schemas/password.schema';

export const loginFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export interface LoginFormValues {
  email: string;
  password: string;
}
