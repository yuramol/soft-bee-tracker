import type { Database } from '@/types';

export type UserRole = 'worker' | 'manager' | 'admin';

export type UserAccess = Database['public']['Tables']['user_access']['Row'];

export interface UserPositions {
  titles: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  dateEmployment: string | null;
  positions: UserPositions | null;
  linkedin: string | null;
  upwork: string | null;
  isConfirmed: boolean;
  isBlocked: boolean;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  linkedin?: string;
  upwork?: string;
  password: string;
}

export interface RecoverPasswordRequest {
  email: string;
}

export interface UpdateProfileRequest {
  username: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  linkedin: string | null;
  upwork: string | null;
}

export interface UpdatePasswordRequest {
  password: string;
}

export interface SignUpMetadata {
  username: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  linkedin: string | null;
  upwork: string | null;
}
