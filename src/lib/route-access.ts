import { ALL_ROLES, GUEST_ONLY_ROUTES_LIST, PUBLIC_ROUTES_LIST, ROLE_RESTRICTED_ROUTES } from '@/constants';
import type { UserRole } from '@/lib/api/auth/types';

/**
 * Decides what the request guard does for a pathname and session.
 * - `allowed`: render the route
 * - `guest-only`: signed-in user on /login or /register, send them into the app
 * - `login`: no session on a protected route
 * - `denied`: signed in, but the role may not open this route
 */
export function getRouteAccess(pathname: string, session: RouteSession | null): RouteAccess {
  if (matchesRouteList(pathname, PUBLIC_ROUTES_LIST)) {
    return session && matchesRouteList(pathname, GUEST_ONLY_ROUTES_LIST) ? 'guest-only' : 'allowed';
  }

  if (!session) {
    return 'login';
  }

  return canRoleAccessRoute(pathname, session.role) ? 'allowed' : 'denied';
}

export function canRoleAccessRoute(pathname: string, role: UserRole | null): boolean {
  const allowedRoles = getAllowedRoles(pathname);

  // a missing or unknown role fails closed, matching private.is_manager_or_admin()
  return role !== null && allowedRoles.includes(role);
}

export function parseUserRole(value: string | null | undefined): UserRole | null {
  return ALL_ROLES.find((role) => role === value) ?? null;
}

export function matchesRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function matchesRouteList(pathname: string, routes: readonly string[]): boolean {
  return routes.some((route) => matchesRoute(pathname, route));
}

function getAllowedRoles(pathname: string): readonly UserRole[] {
  const restrictedRoute = Object.keys(ROLE_RESTRICTED_ROUTES).find((route) => matchesRoute(pathname, route));

  return restrictedRoute ? ROLE_RESTRICTED_ROUTES[restrictedRoute] : ALL_ROLES;
}

export type RouteAccess = 'allowed' | 'guest-only' | 'login' | 'denied';

export interface RouteSession {
  role: UserRole | null;
}
