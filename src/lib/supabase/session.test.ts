import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HOME_ROUTE, ROUTES } from '@/constants';

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
    expect(response.headers.get('location')).toBe(`http://localhost:3000${ROUTES.LOGIN}?next=%2Ftracker%3Ftab%3Dweek`);
  });

  it('treats a claims error as signed out', async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error('invalid jwt') });

    const response = await updateSession(buildRequest(ROUTES.DASHBOARD));

    expect(response.headers.get('location')).toBe(`http://localhost:3000${ROUTES.LOGIN}?next=%2Fdashboard`);
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
    expect(response.headers.get('location')).toBe(`http://localhost:3000${HOME_ROUTE}`);
  });

  it('rewrites a denied role to the access-denied page with 403', async () => {
    signedInAs('worker');

    const response = await updateSession(buildRequest(ROUTES.CREW));

    expect(response.status).toBe(403);
    expect(response.headers.get('x-middleware-rewrite')).toBe(`http://localhost:3000${ROUTES.ACCESS_DENIED}`);
  });

  it('answers a client navigation to a denied route with 200 so the router renders it in place', async () => {
    signedInAs('worker');

    const response = await updateSession(buildRequest(ROUTES.CREW, { 'sec-fetch-dest': 'empty' }));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-rewrite')).toBe(`http://localhost:3000${ROUTES.ACCESS_DENIED}`);
  });

  it('keeps 403 for a browser document load of a denied route', async () => {
    signedInAs('worker');

    const response = await updateSession(buildRequest(ROUTES.CREW, { 'sec-fetch-dest': 'document' }));

    expect(response.status).toBe(403);
  });

  it('sends a signed-in user on login to a safe next path', async () => {
    signedInAs('manager');

    const response = await updateSession(buildRequest(`${ROUTES.LOGIN}?next=%2Fcrew`));

    expect(response.headers.get('location')).toBe(`http://localhost:3000${ROUTES.CREW}`);
  });

  it('ignores an external next on login', async () => {
    signedInAs('manager');

    const response = await updateSession(buildRequest(`${ROUTES.LOGIN}?next=%2F%2Fevil.example`));

    expect(response.headers.get('location')).toBe(`http://localhost:3000${HOME_ROUTE}`);
  });

  // a signed-in invitee clicking an old email link must still see why it failed
  it('shows the link-invalid page to a signed-in user', async () => {
    signedInAs('manager');

    const response = await updateSession(buildRequest(ROUTES.LINK_INVALID));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('denies restricted routes when the role claim is missing', async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: 'user-1' } }, error: null });

    const response = await updateSession(buildRequest(ROUTES.REPORTS));

    expect(response.status).toBe(403);
  });

  it.each([
    ['manager', ROUTES.CREW],
    ['manager', ROUTES.REPORTS]
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

function buildRequest(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'), { headers });
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
