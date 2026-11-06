import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/constants';
import type { UserRole } from '@/lib/api/auth/types';
import { canRoleAccessRoute, getRouteAccess, parseUserRole, type RouteAccess } from '@/lib/route-access';

const APP_ROUTES = [ROUTES.DASHBOARD, ROUTES.TRACKER, ROUTES.PROFILE, ROUTES.PROJECTS, ROUTES.CREW, ROUTES.REPORTS, ROUTES.USERS];

// the agreed matrix (SBT-49); a change here must be a deliberate product decision
const EXPECTED_ACCESS: Record<UserRole, Record<string, RouteAccess>> = {
  worker: {
    [ROUTES.DASHBOARD]: 'allowed',
    [ROUTES.TRACKER]: 'allowed',
    [ROUTES.PROFILE]: 'allowed',
    [ROUTES.PROJECTS]: 'allowed',
    [ROUTES.CREW]: 'denied',
    [ROUTES.REPORTS]: 'denied',
    [ROUTES.USERS]: 'denied'
  },
  manager: {
    [ROUTES.DASHBOARD]: 'allowed',
    [ROUTES.TRACKER]: 'allowed',
    [ROUTES.PROFILE]: 'allowed',
    [ROUTES.PROJECTS]: 'allowed',
    [ROUTES.CREW]: 'allowed',
    [ROUTES.REPORTS]: 'allowed',
    [ROUTES.USERS]: 'denied'
  },
  admin: {
    [ROUTES.DASHBOARD]: 'allowed',
    [ROUTES.TRACKER]: 'allowed',
    [ROUTES.PROFILE]: 'allowed',
    [ROUTES.PROJECTS]: 'allowed',
    [ROUTES.CREW]: 'allowed',
    [ROUTES.REPORTS]: 'allowed',
    [ROUTES.USERS]: 'allowed'
  }
};

describe('getRouteAccess', () => {
  describe.each(Object.entries(EXPECTED_ACCESS))('as %s', (role, expectations) => {
    it.each(Object.entries(expectations))('%s → %s', (route, expected) => {
      expect(getRouteAccess(route, { role: role as UserRole })).toBe(expected);
    });
  });

  it.each(APP_ROUTES)('sends signed-out users on %s to login', (route) => {
    expect(getRouteAccess(route, null)).toBe('login');
  });

  it('protects unlisted routes and the root by default', () => {
    expect(getRouteAccess('/', null)).toBe('login');
    expect(getRouteAccess('/some-new-page', null)).toBe('login');
    expect(getRouteAccess('/some-new-page', { role: 'worker' })).toBe('allowed');
  });

  it('applies restrictions to nested paths but not to lookalike prefixes', () => {
    expect(getRouteAccess('/crew/42', { role: 'worker' })).toBe('denied');
    expect(getRouteAccess('/users/42/edit', { role: 'manager' })).toBe('denied');
    expect(getRouteAccess('/crewmates', { role: 'worker' })).toBe('allowed');
  });

  it('denies restricted routes when the role claim is missing (fail closed)', () => {
    expect(getRouteAccess(ROUTES.CREW, { role: null })).toBe('denied');
    expect(getRouteAccess(ROUTES.USERS, { role: null })).toBe('denied');
  });

  it('keeps auth routes reachable without a session', () => {
    for (const route of [
      ROUTES.LOGIN,
      ROUTES.REGISTER,
      ROUTES.FORGOT_PASSWORD,
      ROUTES.AUTH_CONFIRM,
      ROUTES.UPDATE_PASSWORD,
      ROUTES.ACCESS_DENIED
    ]) {
      expect(getRouteAccess(route, null)).toBe('allowed');
    }
  });

  it('bounces signed-in users away from login and register only', () => {
    expect(getRouteAccess(ROUTES.LOGIN, { role: 'worker' })).toBe('guest-only');
    expect(getRouteAccess(ROUTES.REGISTER, { role: 'admin' })).toBe('guest-only');
    expect(getRouteAccess(ROUTES.UPDATE_PASSWORD, { role: 'worker' })).toBe('allowed');
    expect(getRouteAccess(ROUTES.ACCESS_DENIED, { role: 'worker' })).toBe('allowed');
  });
});

describe('canRoleAccessRoute', () => {
  it('fails closed for a null role', () => {
    expect(canRoleAccessRoute(ROUTES.TRACKER, null)).toBe(false);
  });
});

describe('parseUserRole', () => {
  it.each(['worker', 'manager', 'admin'])('accepts %s', (role) => {
    expect(parseUserRole(role)).toBe(role);
  });

  it.each([null, undefined, '', 'Admin', 'superuser'])('rejects %s', (value) => {
    expect(parseUserRole(value)).toBeNull();
  });
});
