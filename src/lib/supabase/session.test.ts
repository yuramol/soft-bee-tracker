import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/constants';

interface CookieAdapter {
  setAll: (cookies: { name: string; value: string; options: Record<string, string | number | boolean> }[]) => void;
}

const { getClaims, state } = vi.hoisted(() => ({
  getClaims: vi.fn(),
  state: { refreshCookie: false }
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, options: { cookies: CookieAdapter }) => ({
    auth: {
      getClaims: () => {
        // simulate @supabase/ssr refreshing the token during getClaims
        if (state.refreshCookie) {
          options.cookies.setAll([{ name: 'sb-127-auth-token', value: 'refreshed', options: { path: '/' } }]);
        }
        return getClaims() as Promise<ClaimsResult>;
      }
    }
  })
}));

import { updateSession } from '@/lib/supabase/session';

describe('updateSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.refreshCookie = false;
  });

  it('redirects signed-out users on a protected route to login', async () => {
    signedOut();

    const response = await updateSession(buildRequest('/tracker?tab=week'));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`http://localhost:3000${ROUTES.LOGIN}`);
  });

  it('treats a claims error as signed out', async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error('invalid jwt') });

    const response = await updateSession(buildRequest(ROUTES.DASHBOARD));

    expect(response.headers.get('location')).toBe(`http://localhost:3000${ROUTES.LOGIN}`);
  });

  it('lets signed-out users open public routes', async () => {
    signedOut();

    const response = await updateSession(buildRequest(ROUTES.LOGIN));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('sends signed-in users from login to the dashboard', async () => {
    signedInAs('worker');

    const response = await updateSession(buildRequest(ROUTES.LOGIN));

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(`http://localhost:3000${ROUTES.DASHBOARD}`);
  });

  it('rewrites a denied role to the access-denied page with 403', async () => {
    signedInAs('worker');

    const response = await updateSession(buildRequest(ROUTES.CREW));

    expect(response.status).toBe(403);
    expect(response.headers.get('x-middleware-rewrite')).toBe(`http://localhost:3000${ROUTES.ACCESS_DENIED}`);
  });

  it('denies restricted routes when the role claim is missing', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null });

    const response = await updateSession(buildRequest(ROUTES.REPORTS));

    expect(response.status).toBe(403);
  });

  it.each([
    ['manager', ROUTES.CREW],
    ['manager', ROUTES.REPORTS],
    ['admin', ROUTES.USERS]
  ])('passes %s through to %s', async (role, route) => {
    signedInAs(role);

    const response = await updateSession(buildRequest(route));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('location')).toBeNull();
  });

  it.each([
    ['redirect', null, ROUTES.TRACKER],
    ['rewrite', 'worker', ROUTES.CREW],
    ['pass-through', 'worker', ROUTES.TRACKER]
  ])('keeps refreshed session cookies on a %s response', async (_kind, role, route) => {
    state.refreshCookie = true;
    if (role) {
      signedInAs(role);
    } else {
      signedOut();
    }

    const response = await updateSession(buildRequest(route));

    expect(response.cookies.get('sb-127-auth-token')?.value).toBe('refreshed');
  });
});

function buildRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'));
}

function signedOut() {
  getClaims.mockResolvedValue({ data: null, error: null });
}

function signedInAs(role: string) {
  getClaims.mockResolvedValue({ data: { claims: { sub: 'user-1', user_role: role } }, error: null });
}

interface ClaimsResult {
  data: { claims: Record<string, string> } | null;
  error: Error | null;
}
