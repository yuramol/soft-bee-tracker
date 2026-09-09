import { z } from 'zod';

const optionalUrlSchema = z.url('Enter a valid URL').or(z.literal(''));

export const profileFormSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z
    .string()
    .regex(/^\+?[\d\s()-]{7,20}$/, 'Enter a valid phone number')
    .or(z.literal('')),
  avatarUrl: optionalUrlSchema,
  linkedin: optionalUrlSchema,
  upwork: optionalUrlSchema
});

export interface ProfileFormValues {
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
  linkedin: string;
  upwork: string;
}
