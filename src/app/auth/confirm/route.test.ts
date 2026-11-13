import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/constants';

const { verifyOtp, exchangeCodeForSession } = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => Promise.resolve({ auth: { verifyOtp, exchangeCodeForSession } })
}));

import { GET } from './route';

describe('confirm route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifyOtp.mockResolvedValue({ error: null });
    exchangeCodeForSession.mockResolvedValue({ error: null });
  });

  it('signs an invitee in and sends them to set their password', async () => {
    const response = await GET(buildRequest(`${ROUTES.AUTH_CONFIRM}?token_hash=abc&type=invite&next=/register`));

    expect(verifyOtp).toHaveBeenCalledWith({ type: 'invite', token_hash: 'abc' });
    expect(response.headers.get('location')).toBe(`http://localhost:3000${ROUTES.REGISTER}`);
  });

  it('sends an expired or used invite link to the link-invalid page', async () => {
    verifyOtp.mockResolvedValue({ error: { message: 'Email link is invalid or has expired', code: 'otp_expired' } });

    const response = await GET(buildRequest(`${ROUTES.AUTH_CONFIRM}?token_hash=old&type=invite&next=/register`));

    expect(response.headers.get('location')).toBe(`http://localhost:3000${ROUTES.LINK_INVALID}`);
  });

  it('treats a link without a token as invalid', async () => {
    const response = await GET(buildRequest(`${ROUTES.AUTH_CONFIRM}?type=invite`));

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe(`http://localhost:3000${ROUTES.LINK_INVALID}`);
  });

  it('ignores an unknown link type', async () => {
    const response = await GET(buildRequest(`${ROUTES.AUTH_CONFIRM}?token_hash=abc&type=owner`));

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(response.headers.get('location')).toBe(`http://localhost:3000${ROUTES.LINK_INVALID}`);
  });
});

function buildRequest(path: string): NextRequest {
  return new NextRequest(new URL(path, 'http://localhost:3000'));
}
