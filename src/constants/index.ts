import type { UserRole } from '@/lib/api/auth/types';

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  AUTH_CONFIRM: '/auth/confirm',
  UPDATE_PASSWORD: '/auth/update-password',
  ACCESS_DENIED: '/access-denied',
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  TRACKER: '/tracker',
  CREW: '/crew',
  REPORTS: '/reports',
  USERS: '/users',
  PROFILE: '/profile'
} as const;

// reachable without a session; signed-in users are bounced from GUEST_ONLY_ROUTES_LIST
export const PUBLIC_ROUTES_LIST = [
  ROUTES.LOGIN,
  ROUTES.REGISTER,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.AUTH_CONFIRM,
  ROUTES.UPDATE_PASSWORD,
  ROUTES.ACCESS_DENIED
];

export const GUEST_ONLY_ROUTES_LIST = [ROUTES.LOGIN, ROUTES.REGISTER];

export const ALL_ROLES: readonly UserRole[] = ['worker', 'manager', 'admin'];

// role-restricted routes. any route not public and not listed here only needs a session.
// keep in sync with RLS: hiding a page is UX, the database still enforces data access.
export const ROLE_RESTRICTED_ROUTES: Record<string, readonly UserRole[]> = {
  [ROUTES.CREW]: ['manager', 'admin'],
  [ROUTES.REPORTS]: ['manager', 'admin'],
  [ROUTES.USERS]: ['admin']
};

export const ADMIN_ROLE = 'admin';
