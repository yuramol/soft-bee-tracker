export type UserRole = 'worker' | 'manager' | 'admin';

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

export interface SignUpMetadata {
  role: UserRole;
  username: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  linkedin: string | null;
  upwork: string | null;
  is_confirmed: boolean;
  is_blocked: boolean;
}
