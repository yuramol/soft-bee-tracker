import { z } from 'zod';

export const forgotPasswordFormSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address')
});

export interface ForgotPasswordFormValues {
  email: string;
}
