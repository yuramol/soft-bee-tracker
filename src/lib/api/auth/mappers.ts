import type { Database } from '@/types';
import type { UserPositions, UserProfile } from '@/lib/api/auth/types';

type UserRow = Database['public']['Tables']['users']['Row'];
type Json = Database['public']['Tables']['users']['Row']['positions'];

export function mapUserRowToProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    role: row.role,
    dateEmployment: row.date_employment,
    positions: parseUserPositions(row.positions),
    salary: row.salary,
    salaryInfo: row.salary_info,
    typeSalary: row.type_salary,
    linkedin: row.linkedin,
    upwork: row.upwork,
    isConfirmed: row.is_confirmed,
    isBlocked: row.is_blocked
  };
}

function parseUserPositions(value: Json): UserPositions | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const titles = (value as Record<string, Json | undefined>).titles;

  if (!Array.isArray(titles)) {
    return null;
  }

  return { titles: titles.filter((title): title is string => typeof title === 'string') };
}
