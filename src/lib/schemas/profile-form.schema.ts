import { z } from 'zod';

import { emailSchema } from '@/lib/schemas/email.schema';
import { isValidTimeZone } from '@/lib/time-zones';
import content from './content.json';

const optionalUrlSchema = z.url(content.profile.invalidUrl).or(z.literal(''));

export const profileFormSchema = z.object({
  username: z.string().trim().min(1, content.profile.usernameRequired),
  firstName: z.string().trim().min(1, content.profile.firstNameRequired),
  lastName: z.string().trim().min(1, content.profile.lastNameRequired),
  phone: z
    .string()
    .regex(/^\+?[\d\s()-]{7,20}$/, content.profile.invalidPhone)
    .or(z.literal('')),
  linkedin: optionalUrlSchema,
  upwork: optionalUrlSchema,
  timeZone: z.string().refine((value) => value === '' || isValidTimeZone(value), content.profile.invalidTimeZone)
});

export function createEmailChangeFormSchema(currentEmail: string) {
  return z.object({
    email: emailSchema.refine((value) => value.trim().toLowerCase() !== currentEmail.trim().toLowerCase(), content.profile.sameEmail)
  });
}

export interface ProfileFormValues {
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  linkedin: string;
  upwork: string;
  timeZone: string;
}

export interface EmailChangeFormValues {
  email: string;
}
