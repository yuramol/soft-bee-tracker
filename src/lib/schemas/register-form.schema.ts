import { z } from 'zod';

import { emailSchema } from '@/lib/schemas/email.schema';
import { passwordSchema } from '@/lib/schemas/password.schema';

const optionalUrlSchema = z.url('Enter a valid URL').or(z.literal(''));

export const registerFormSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    email: emailSchema,
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z
      .string()
      .regex(/^\+?[\d\s()-]{7,20}$/, 'Enter a valid phone number')
      .or(z.literal('')),
    linkedin: optionalUrlSchema,
    upwork: optionalUrlSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password')
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

export interface RegisterFormValues {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  linkedin: string;
  upwork: string;
  password: string;
  confirmPassword: string;
}
