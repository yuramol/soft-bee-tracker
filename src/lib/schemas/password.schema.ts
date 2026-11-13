import { z } from 'zod';
import content from './content.json';

export const passwordSchema = z
  .string()
  .min(1, content.password.required)
  .min(8, content.password.minLength)
  .regex(/[A-Z]/, content.password.uppercase)
  .regex(/[a-z]/, content.password.lowercase)
  .regex(/[0-9]/, content.password.number);
