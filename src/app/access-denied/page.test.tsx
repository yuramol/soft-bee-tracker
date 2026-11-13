import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/constants';

const { getRouteSession, getSessionProfile } = vi.hoisted(() => ({
  getRouteSession: vi.fn(),
  getSessionProfile: vi.fn()
}));

vi.mock('@/lib/api/auth/server', () => ({ getRouteSession, getSessionProfile }));

import AccessDeniedPage from './page';

const BLOCKED_REDIRECT = `NEXT_REDIRECT:${ROUTES.SIGN_OUT}?reason=blocked`;

// the proxy rewrites a denied route here on the JWT claim alone, so the page is
// where a blocked user with a still-valid token must be caught
describe('access-denied page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSessionProfile.mockResolvedValue({ id: 'user-1' });
  });

  it.each([['worker'], [null]])('signs out a blocked user whose token role is %s', async (role) => {
    getRouteSession.mockResolvedValue({ role });
    getSessionProfile.mockRejectedValue(new Error(BLOCKED_REDIRECT));

    await expect(AccessDeniedPage()).rejects.toThrow(BLOCKED_REDIRECT);
  });

  it('shows the page to an active user with the wrong role', async () => {
    getRouteSession.mockResolvedValue({ role: 'worker' });

    await expect(AccessDeniedPage()).resolves.toBeTruthy();
    expect(getSessionProfile).toHaveBeenCalledOnce();
  });

  it('skips the profile check without a session', async () => {
    getRouteSession.mockResolvedValue(null);

    await expect(AccessDeniedPage()).resolves.toBeTruthy();
    expect(getSessionProfile).not.toHaveBeenCalled();
  });
});
