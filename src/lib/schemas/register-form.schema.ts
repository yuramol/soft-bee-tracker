import { z } from 'zod';

import { emailSchema } from '@/lib/schemas/email.schema';
import { passwordSchema } from '@/lib/schemas/password.schema';
import content from './content.json';

const optionalUrlSchema = z.url(content.profile.invalidUrl).or(z.literal(''));

export const registerFormSchema = z
  .object({
    username: z.string().min(1, content.profile.usernameRequired),
    email: emailSchema,
    firstName: z.string().min(1, content.profile.firstNameRequired),
    lastName: z.string().min(1, content.profile.lastNameRequired),
    phone: z
      .string()
      .regex(/^\+?[\d\s()-]{7,20}$/, content.profile.invalidPhone)
      .or(z.literal('')),
    linkedin: optionalUrlSchema,
    upwork: optionalUrlSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, content.password.confirmRequired)
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: content.password.mismatch,
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
