import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserRole } from '@/lib/api/auth/types';

const { getRouteSession, resolveSessionProfile, maybeSingle, getUserById, eq, inviteUserByEmail, updateRole } = vi.hoisted(() => ({
  getRouteSession: vi.fn(),
  resolveSessionProfile: vi.fn(),
  maybeSingle: vi.fn(),
  getUserById: vi.fn(),
  eq: vi.fn(),
  inviteUserByEmail: vi.fn(),
  updateRole: vi.fn()
}));

vi.mock('@/lib/api/auth/server', () => ({ getRouteSession, resolveSessionProfile }));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (column: string, value: string) => {
          eq(column, value);
          return { maybeSingle };
        }
      }),
      update: (values: { role: UserRole }) => ({
        eq: (column: string, id: string) => ({
          select: () => ({
            single: () => updateRole(table, values, column, id) as Promise<{ error: { message: string; code?: string } | null }>
          })
        })
      })
    }),
    auth: { admin: { getUserById, inviteUserByEmail } }
  })
}));

// next's redirect() throws a NEXT_REDIRECT error that must escape the action
vi.mock('next/navigation', () => ({
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
  }
}));

import { inviteMember } from '@/lib/api/invites/actions';

describe('inviteMember', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    noExistingAccount();
    inviteUserByEmail.mockResolvedValue({ data: { user: { id: 'user-new' } }, error: null });
    updateRole.mockResolvedValue({ error: null });
  });

  describe('permission to invite', () => {
    it('refuses without a session', async () => {
      getRouteSession.mockResolvedValue(null);

      await expect(inviteMember({ email: 'new@softbee.dev', role: 'worker' })).resolves.toMatchObject({ status: 'forbidden' });
      expect(maybeSingle).not.toHaveBeenCalled();
    });

    it('refuses a session the Auth server no longer accepts', async () => {
      getRouteSession.mockResolvedValue({ role: 'admin' });
      resolveSessionProfile.mockResolvedValue({ kind: 'none' });

      await expect(inviteMember({ email: 'new@softbee.dev', role: 'worker' })).resolves.toMatchObject({ status: 'forbidden' });
    });

    it.each<[UserRole | null]>([['worker'], [null]])('refuses an inviter whose role is %s', async (role) => {
      signInAs(role);

      await expect(inviteMember({ email: 'new@softbee.dev', role: 'worker' })).resolves.toMatchObject({
        status: 'forbidden',
        message: "Your role can't invite teammates."
      });
    });

    it.each<UserRole>(['manager', 'admin'])('refuses a manager inviting someone as %s', async (role) => {
      signInAs('manager');

      await expect(inviteMember({ email: 'new@softbee.dev', role })).resolves.toMatchObject({ status: 'forbidden' });
      expect(maybeSingle).not.toHaveBeenCalled();
    });

    // a thrown redirect would leave the useMutation call pending, so the reset
    // comes back as a value the dialog follows with a full page load
    it('returns the sign-out path for a blocked user instead of redirecting', async () => {
      getRouteSession.mockResolvedValue({ role: 'admin' });
      resolveSessionProfile.mockResolvedValue({ kind: 'reset', signOutPath: '/auth/sign-out?reason=blocked' });

      await expect(inviteMember({ email: 'new@softbee.dev', role: 'worker' })).resolves.toEqual({
        status: 'signed-out',
        message: 'Your session has ended. Signing you out…',
        signOutPath: '/auth/sign-out?reason=blocked'
      });
      expect(maybeSingle).not.toHaveBeenCalled();
    });

    it('lets next control-flow errors escape', async () => {
      getRouteSession.mockResolvedValue({ role: 'admin' });
      resolveSessionProfile.mockRejectedValue(new Error('NEXT_REDIRECT:/somewhere'));

      await expect(inviteMember({ email: 'new@softbee.dev', role: 'worker' })).rejects.toThrow('NEXT_REDIRECT');
    });
  });

  describe('input', () => {
    it('returns field errors for a bad email and role', async () => {
      signInAs('admin');

      const result = await inviteMember({ email: 'nope', role: 'owner' as UserRole });

      expect(result).toMatchObject({
        status: 'invalid',
        fieldErrors: { email: 'Enter a valid email address', role: 'Choose a role' }
      });
      expect(maybeSingle).not.toHaveBeenCalled();
    });

    it('looks up the normalized email', async () => {
      signInAs('admin');

      await inviteMember({ email: '  New@SoftBee.dev ', role: 'worker' });

      expect(eq).toHaveBeenCalledWith('email', 'new@softbee.dev');
    });
  });

  describe('existing accounts and repeat invitations', () => {
    it('rejects an email that already has an account', async () => {
      signInAs('admin');
      existingAccount({ email_confirmed_at: '2026-11-01T10:00:00Z', invited_at: null });

      await expect(inviteMember({ email: 'worker@softbee.dev', role: 'worker' })).resolves.toEqual({
        status: 'already-member',
        message: 'worker@softbee.dev already has an account.'
      });
    });

    it('offers to resend a pending invitation instead of sending it again', async () => {
      signInAs('manager');
      existingAccount({ email_confirmed_at: null, invited_at: '2026-11-09T10:00:00Z' });

      await expect(inviteMember({ email: 'pending@softbee.dev', role: 'worker' })).resolves.toMatchObject({
        status: 'already-invited',
        canResend: true
      });
      expect(inviteUserByEmail).not.toHaveBeenCalled();
    });

    it('resends a pending invitation on request', async () => {
      signInAs('manager');
      existingAccount({ email_confirmed_at: null, invited_at: '2026-11-09T10:00:00Z' });

      await expect(inviteMember({ email: 'pending@softbee.dev', role: 'worker', resend: true })).resolves.toEqual({
        status: 'resent',
        message: 'Invite sent to pending@softbee.dev again.'
      });
      expect(inviteUserByEmail).toHaveBeenCalledWith('pending@softbee.dev');
    });

    it.each<UserRole>(['admin', 'manager'])('keeps a pending %s invite on resend instead of taking the form role', async (pendingRole) => {
      signInAs('admin');
      existingAccount({ email_confirmed_at: null, invited_at: '2026-11-09T10:00:00Z' }, pendingRole);

      await expect(inviteMember({ email: 'pending@softbee.dev', role: 'worker', resend: true })).resolves.toMatchObject({
        status: 'resent'
      });
      expect(updateRole).toHaveBeenCalledWith('user_access', { role: pendingRole }, 'user_id', 'user-new');
      expect(updateRole).not.toHaveBeenCalledWith('user_access', { role: 'worker' }, 'user_id', 'user-new');
    });

    it('never resends to an account that already accepted', async () => {
      signInAs('admin');
      existingAccount({ email_confirmed_at: '2026-11-01T10:00:00Z', invited_at: '2026-10-30T10:00:00Z' });

      await expect(inviteMember({ email: 'worker@softbee.dev', role: 'worker', resend: true })).resolves.toMatchObject({
        status: 'already-member'
      });
      expect(inviteUserByEmail).not.toHaveBeenCalled();
    });

    it.each([false, true])("won't let a manager resend an admin's pending admin invite, or learn its role (resend=%s)", async (resend) => {
      signInAs('manager');
      existingAccount({ email_confirmed_at: null, invited_at: '2026-11-09T10:00:00Z' }, 'admin');

      const result = await inviteMember({ email: 'boss@softbee.dev', role: 'worker', resend });

      expect(result).toEqual({
        status: 'already-invited',
        message: "boss@softbee.dev has already been invited and hasn't accepted yet. Ask an admin to send the invite again.",
        canResend: false
      });
      expect(result.message).not.toContain('admin invite');
      expect(inviteUserByEmail).not.toHaveBeenCalled();
      expect(updateRole).not.toHaveBeenCalled();
    });

    it('reports a lookup failure without leaking it', async () => {
      signInAs('admin');
      maybeSingle.mockResolvedValue({ data: null, error: { message: 'connection refused' } });

      await expect(inviteMember({ email: 'new@softbee.dev', role: 'worker' })).resolves.toEqual({
        status: 'error',
        message: "We couldn't send this invite. Try again in a moment."
      });
    });
  });

  describe('sending', () => {
    it.each<[UserRole, UserRole]>([
      ['admin', 'admin'],
      ['admin', 'manager'],
      ['manager', 'worker']
    ])('sends the invite for %s inviting a %s and stores that role', async (inviter, role) => {
      signInAs(inviter);

      await expect(inviteMember({ email: 'new@softbee.dev', role })).resolves.toEqual({
        status: 'sent',
        message: 'Invite sent to new@softbee.dev.'
      });
      expect(inviteUserByEmail).toHaveBeenCalledWith('new@softbee.dev');
      // since SBT-8 roles live in user_access, keyed by user_id
      expect(updateRole).toHaveBeenCalledWith('user_access', { role }, 'user_id', 'user-new');
    });

    it('treats an email the Auth server already knows as an existing account', async () => {
      signInAs('admin');
      inviteUserByEmail.mockResolvedValue({
        data: { user: null },
        error: new AuthApiError('A user with this email address has already been registered', 422, 'email_exists')
      });

      await expect(inviteMember({ email: 'new@softbee.dev', role: 'worker' })).resolves.toMatchObject({ status: 'already-member' });
      expect(updateRole).not.toHaveBeenCalled();
    });

    it('reports the email rate limit so the user can try later', async () => {
      signInAs('admin');
      inviteUserByEmail.mockResolvedValue({
        data: { user: null },
        error: new AuthApiError('email rate limit exceeded', 429, 'over_email_send_rate_limit')
      });

      await expect(inviteMember({ email: 'new@softbee.dev', role: 'worker' })).resolves.toMatchObject({ status: 'rate-limited' });
    });

    it('reports an unreachable Auth server as a retryable error without details', async () => {
      signInAs('admin');
      inviteUserByEmail.mockResolvedValue({ data: { user: null }, error: new AuthRetryableFetchError('fetch failed', 0) });

      await expect(inviteMember({ email: 'new@softbee.dev', role: 'worker' })).resolves.toEqual({
        status: 'error',
        message: "We couldn't send this invite. Try again in a moment."
      });
    });

    it('treats a role write that matched no row as not saved', async () => {
      signInAs('admin');
      updateRole.mockResolvedValue({ error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } });

      await expect(inviteMember({ email: 'new@softbee.dev', role: 'manager' })).resolves.toMatchObject({ status: 'error' });
    });

    it('says so when the invite went out but the role was not saved', async () => {
      signInAs('admin');
      updateRole.mockResolvedValue({ error: { message: 'connection reset' } });

      await expect(inviteMember({ email: 'new@softbee.dev', role: 'manager' })).resolves.toEqual({
        status: 'error',
        message:
          "The invite to new@softbee.dev was sent, but their role couldn't be saved. They're a worker for now; an admin can change their role in Crew."
      });
    });
  });
});

function signInAs(role: UserRole | null) {
  getRouteSession.mockResolvedValue({ role });
  resolveSessionProfile.mockResolvedValue({ kind: 'active', profile: { id: 'inviter-1', isBlocked: false } });
}

function noExistingAccount() {
  maybeSingle.mockResolvedValue({ data: null, error: null });
}

function existingAccount(user: { email_confirmed_at: string | null; invited_at: string | null }, role: UserRole = 'worker') {
  maybeSingle.mockResolvedValue({ data: { id: 'user-2', user_access: { role } }, error: null });
  getUserById.mockResolvedValue({ data: { user: { id: 'user-2', ...user } }, error: null });
}
