export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  UPDATE_PASSWORD: '/auth/update-password',
  DASHBOARD: '/dashboard'
} as const;

export const PROTECTED_ROUTES_LIST = ['/dashboard'];

export const ALLOW_NO_AUTHORIZED_ROUTES_LIST = ['/login', '/register', '/forgot-password'];

export const ALLOW_AUTHORIZED_ROUTES_LIST = ['/login', '/register'];
