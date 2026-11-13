import { z } from 'zod';

import type { UserRole } from '@/lib/api/auth/types';
import { emailSchema } from '@/lib/schemas/email.schema';
import content from './content.json';

// declared before the schema: it is read at module load
const INVITE_ROLES: readonly [UserRole, ...UserRole[]] = ['worker', 'manager', 'admin'];

// shared by the dialog and the server action, so both apply the same rules.
// the email is trimmed and lowercased first: auth stores emails lowercase, and
// the duplicate checks compare against that
export const inviteMemberFormSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(emailSchema),
  role: z.enum(INVITE_ROLES, { message: content.invite.roleRequired })
});

export interface InviteMemberFormValues {
  email: string;
  role: UserRole;
}
