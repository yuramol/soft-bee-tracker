import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/constants';
import type { UserRole } from '@/lib/api/auth/types';

const { getUser, single, redirect } = vi.hoisted(() => ({
  getUser: vi.fn(),
  single: vi.fn(),
  // next/navigation's redirect throws to stop rendering; mirror that
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  })
}));

vi.mock('next/navigation', () => ({ redirect }));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () =>
    Promise.resolve({
      auth: { getUser },
      from: () => ({ select: () => ({ eq: () => ({ single }) }) })
    })
}));

// node-only unit test of the server helper; the rule guards client bundles
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { requireRouteAccess } from '@/lib/api/auth/server';

describe('requireRouteAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to login without a session', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });

    await expect(requireRouteAccess(ROUTES.CREW)).rejects.toThrow(`NEXT_REDIRECT:${ROUTES.LOGIN}`);
  });

  it.each<[string, UserRole]>([
    [ROUTES.CREW, 'worker'],
    [ROUTES.REPORTS, 'worker'],
    [ROUTES.USERS, 'worker'],
    [ROUTES.USERS, 'manager']
  ])('redirects %s for %s to access denied', async (route, role) => {
    signInAs(role);

    await expect(requireRouteAccess(route)).rejects.toThrow(`NEXT_REDIRECT:${ROUTES.ACCESS_DENIED}`);
  });

  it.each<[string, UserRole]>([
    [ROUTES.CREW, 'manager'],
    [ROUTES.REPORTS, 'manager'],
    [ROUTES.USERS, 'admin']
  ])('returns the profile on %s for %s', async (route, role) => {
    signInAs(role);

    await expect(requireRouteAccess(route)).resolves.toMatchObject({ role });
    expect(redirect).not.toHaveBeenCalled();
  });
});

function signInAs(role: UserRole) {
  getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  single.mockResolvedValue({ data: buildUserRow(role), error: null });
}

function buildUserRow(role: UserRole) {
  return {
    id: 'user-1',
    created_at: '',
    updated_at: '',
    username: 'test',
    email: 'test@softbee.dev',
    first_name: 'Test',
    last_name: 'User',
    phone: null,
    avatar_url: null,
    role,
    date_employment: null,
    positions: null,
    salary: null,
    salary_info: null,
    type_salary: null,
    linkedin: null,
    upwork: null,
    is_confirmed: true,
    is_blocked: false
  };
}
