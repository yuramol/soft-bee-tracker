import { parseUserPositions } from '@/lib/api/auth/mappers';
import type { ProjectPerson } from '@/lib/api/users/types';
import { getProfilePosition, getProfileStatus } from '@/lib/profile';
import type { Database } from '@/types';

type ProjectPersonRow = Database['public']['Functions']['get_project_people']['Returns'][number];

export function mapProjectPersonRows(rows: ProjectPersonRow[]): ProjectPerson[] {
  return rows.map((row) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    position: getProfilePosition({ positions: parseUserPositions(row.positions) }),
    status: getProfileStatus({ isBlocked: row.is_blocked, isConfirmed: row.is_confirmed })
  }));
}
