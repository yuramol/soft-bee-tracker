import type { Database } from '@/types';
import type { UpdateAvatarRequest, UpdateProfileRequest, UserPositions, UserProfile } from '@/lib/api/auth/types';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserUpdate = Database['public']['Tables']['users']['Update'];
type Json = Database['public']['Tables']['users']['Row']['positions'];

export const USER_COLUMNS =
  'id, created_at, updated_at, username, email, first_name, last_name, phone, avatar_url, role, date_employment, positions, salary, salary_info, type_salary, linkedin, upwork, time_zone, is_confirmed, is_blocked';

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
    timeZone: row.time_zone,
    isConfirmed: row.is_confirmed,
    isBlocked: row.is_blocked
  };
}

export function parseUserPositions(value: Json): UserPositions | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const titles = (value as Record<string, Json | undefined>).titles;

  if (!Array.isArray(titles)) {
    return null;
  }

  return { titles: titles.filter((title): title is string => typeof title === 'string') };
}

// only the columns a user owns; role, salary and the confirmation flags are
// admin-controlled and deliberately absent from the update payload
export function mapProfileUpdateToUserRow(request: UpdateProfileRequest): UserUpdate {
  return {
    username: request.username,
    first_name: request.firstName,
    last_name: request.lastName,
    phone: request.phone,
    linkedin: request.linkedin,
    upwork: request.upwork,
    time_zone: request.timeZone
  };
}

// the photo is saved on its own so it never carries unsaved form edits with it
export function mapAvatarUpdateToUserRow(request: UpdateAvatarRequest): UserUpdate {
  return { avatar_url: request.avatarUrl };
}
