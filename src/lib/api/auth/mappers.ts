import type { Database } from '@/types';
import type { ApiError } from '@/types/api-error';
import type { UpdateProfileRequest, UserAccess, UserPositions, UserProfile } from '@/lib/api/auth/types';
import content from './content.json';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserUpdate = Database['public']['Tables']['users']['Update'];
type Json = Database['public']['Tables']['users']['Row']['positions'];

export const USER_COLUMNS =
  'id, created_at, updated_at, username, email, first_name, last_name, phone, avatar_url, date_employment, positions, linkedin, upwork, user_access(role, is_confirmed, is_blocked)';

interface UserProfileRow extends UserRow {
  user_access: Pick<UserAccess, 'role' | 'is_confirmed' | 'is_blocked'> | null;
}

export function mapUserRowToProfile(row: UserProfileRow): UserProfile {
  const access = row.user_access;

  if (!access) {
    throw {
      message: content.accessMissing,
      statusCode: 500
    } satisfies ApiError;
  }

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    role: access.role,
    dateEmployment: row.date_employment,
    positions: parseUserPositions(row.positions),
    linkedin: row.linkedin,
    upwork: row.upwork,
    isConfirmed: access.is_confirmed,
    isBlocked: access.is_blocked
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

// only the columns a user owns
export function mapProfileUpdateToUserRow(request: UpdateProfileRequest): UserUpdate {
  return {
    username: request.username,
    first_name: request.firstName,
    last_name: request.lastName,
    phone: request.phone,
    avatar_url: request.avatarUrl,
    linkedin: request.linkedin,
    upwork: request.upwork
  };
}
