'use server';

import { isAuthApiError } from '@supabase/supabase-js';
import { unstable_rethrow } from 'next/navigation';
import { z } from 'zod';

import type { UserRole } from '@/lib/api/auth/types';
import { getRouteSession, resolveSessionProfile } from '@/lib/api/auth/server';
import { canInviteRole, getInvitableRoles } from '@/lib/api/invites/permissions';
import type { InviteMemberInput, InviteMemberResult } from '@/lib/api/invites/types';
import { formatText } from '@/lib/format-text';
import { inviteMemberFormSchema } from '@/lib/schemas/invite-member-form.schema';
import { createServiceClient } from '@/lib/supabase/server';
import content from './content.json';

/**
 * Checks and sends an invite (SBT-54, SBT-55). Checks run cheapest and most
 * fundamental first:
 * 1. a live, unblocked session whose user_role claim may invite at all
 * 2. the input, with the same zod schema the dialog uses
 * 3. the requested role is one this inviter may assign
 * 4. the email has no account; an open invite is only sent again on an
 *    explicit resend, only by someone who could have sent it, and with the
 *    role it was sent with
 *
 * Then the Supabase invite email goes out and the invited role is stored. The
 * client's input is never trusted: a hand-crafted call runs the same checks as
 * the dialog. Nothing retries on its own, so no one gets duplicate emails; the
 * dialog keeps the form for a manual retry.
 */
export async function inviteMember(input: InviteMemberInput): Promise<InviteMemberResult> {
  try {
    const inviter = await getInviter();

    if (inviter.kind === 'reset') {
      return { status: 'signed-out', message: content.sessionEnded, signOutPath: inviter.signOutPath };
    }

    if (inviter.kind === 'none') {
      return { status: 'forbidden', message: content.signInRequired };
    }

    const inviterRole = inviter.role;

    if (getInvitableRoles(inviterRole).length === 0) {
      return { status: 'forbidden', message: content.notAllowed };
    }

    const parsed = inviteMemberFormSchema.safeParse(input);

    if (!parsed.success) {
      const { fieldErrors } = z.flattenError(parsed.error);

      return {
        status: 'invalid',
        message: content.invalidInput,
        fieldErrors: { email: fieldErrors.email?.[0], role: fieldErrors.role?.[0] }
      };
    }

    const { email, role } = parsed.data;

    if (!canInviteRole(inviterRole, role)) {
      return { status: 'forbidden', message: formatText(content.roleNotAllowed, { role }) };
    }

    const existingAccount = await findExistingAccount(email);

    if (existingAccount?.kind === 'member') {
      return { status: 'already-member', message: formatText(content.alreadyMember, { email }) };
    }

    if (existingAccount?.kind === 'invited') {
      // a manager resending an admin's pending admin invite would rewrite it
      // as a worker invite, so only someone who could send that role may
      // resend. that inviter gets no resend offer and no hint of the role
      const canResend = canInviteRole(inviterRole, existingAccount.role);

      if (input.resend !== true || !canResend) {
        return {
          status: 'already-invited',
          message: formatText(canResend ? content.alreadyInvited : content.alreadyInvitedByOther, { email }),
          canResend
        };
      }
    }

    // a resend keeps the role the person was invited with. the form's role
    // (worker by default) would otherwise silently downgrade a pending admin
    // or manager invite; changing a role is done from Crew, not by resending
    if (existingAccount?.kind === 'invited') {
      return await sendInvite(email, existingAccount.role, 'resent');
    }

    return await sendInvite(email, role, 'sent');
  } catch (error) {
    // next's own control-flow errors (e.g. dynamic rendering bailouts) must
    // propagate; session resets come back as a 'signed-out' value instead
    unstable_rethrow(error);

    return { status: 'error', message: content.unexpectedError };
  }
}

// resolveSessionProfile asks the Auth server and catches blocked users, so a
// session the proxy still trusts can't invite after it was revoked or blocked.
// it returns the reset instead of redirecting: a redirect thrown from an action
// called through useMutation targets the sign-out route handler, which the
// client router can't render, and leaves the mutation pending
async function getInviter(): Promise<Inviter> {
  const session = await getRouteSession();

  if (!session) {
    return { kind: 'none' };
  }

  const state = await resolveSessionProfile();

  if (state.kind === 'active') {
    return { kind: 'active', role: session.role };
  }

  return state;
}

// the service client reads other users' rows and auth data, which the
// inviter's own RLS-scoped session can't see. server-only: createServiceClient
// lives in lib/supabase/server and this file only runs as a server action.
async function findExistingAccount(email: string): Promise<ExistingAccount> {
  const supabase = createServiceClient();
  const { data: row, error: rowError } = await supabase.from('users').select('id, user_access(role)').eq('email', email).maybeSingle();

  if (rowError) {
    throw rowError;
  }

  if (!row) {
    return null;
  }

  const { data, error } = await supabase.auth.admin.getUserById(row.id);

  if (error) {
    throw error;
  }

  // an accepted invite (or any finished sign-up) confirms the email; anything
  // else is an invite or sign-up still waiting, which can be resent
  // no access row yet reads as the signup trigger's default, worker: the
  // least privileged guess, so a manager is never refused a resend wrongly
  return data.user.email_confirmed_at ? { kind: 'member' } : { kind: 'invited', role: row.user_access?.role ?? 'worker' };
}

// inviteUserByEmail creates the auth user (the signup trigger adds the
// public.users and public.user_access rows) and sends the email; for a user who
// hasn't accepted yet it sends a fresh link. the trigger always creates a worker,
// so the invited role is stored in user_access afterwards. if that write fails the user stays a worker, the safe
// direction, and an admin sets the role from Crew.
async function sendInvite(email: string, role: UserRole, sentStatus: 'sent' | 'resent'): Promise<InviteMemberResult> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);

  if (error) {
    // the account was created between the lookup and the send, or under an
    // email public.users doesn't show yet: the Auth server is the final word
    if (isAuthApiError(error) && error.code === EMAIL_EXISTS_ERROR_CODE) {
      return { status: 'already-member', message: formatText(content.alreadyMember, { email }) };
    }

    if (isAuthApiError(error) && error.status === TOO_MANY_REQUESTS_STATUS) {
      return { status: 'rate-limited', message: content.rateLimited };
    }

    throw error;
  }

  // .single() turns "no row matched" into an error; a plain update would
  // report success with nothing stored
  const { error: roleError } = await supabase.from('user_access').update({ role }).eq('user_id', data.user.id).select('user_id').single();

  if (roleError) {
    return { status: 'error', message: formatText(content.roleNotSet, { email }) };
  }

  return { status: sentStatus, message: formatText(sentStatus === 'sent' ? content.sent : content.resent, { email }) };
}

const EMAIL_EXISTS_ERROR_CODE = 'email_exists';

const TOO_MANY_REQUESTS_STATUS = 429;

type ExistingAccount = { kind: 'member' } | { kind: 'invited'; role: UserRole } | null;

type Inviter = { kind: 'active'; role: UserRole | null } | { kind: 'none' } | { kind: 'reset'; signOutPath: string };
