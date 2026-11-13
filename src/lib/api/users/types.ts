import type { UserRole, UserStatus } from '@/lib/api/auth';

// the public part of a profile that project pages may show about other people
export interface ProjectPerson {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  position: string | null;
  status: UserStatus;
}
