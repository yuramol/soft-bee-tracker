import { z } from 'zod';

// min(1) runs first so an empty field says "required" instead of "invalid format"
export const emailSchema = z.string().min(1, 'Email is required').pipe(z.email('Enter a valid email address'));
