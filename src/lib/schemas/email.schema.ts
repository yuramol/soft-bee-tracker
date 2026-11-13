import { z } from 'zod';
import content from './content.json';

// min(1) runs first so an empty field says "required" instead of "invalid format"
export const emailSchema = z.string().min(1, content.email.required).pipe(z.email(content.email.invalid));
