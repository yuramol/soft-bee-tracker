import { z } from 'zod';

import { emailSchema } from '@/lib/schemas/email.schema';

export const forgotPasswordFormSchema = z.object({
  email: emailSchema
});

export interface ForgotPasswordFormValues {
  email: string;
}
