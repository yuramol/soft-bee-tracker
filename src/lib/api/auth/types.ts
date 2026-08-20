export type UserRole = 'worker' | 'manager' | 'admin';

export type SalaryType = 'hourly' | 'fixed' | 'project';

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
  salary: number | null;
  salaryInfo: string | null;
  typeSalary: SalaryType | null;
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
