import type { UserRole } from '@/lib/api/auth/types';

export interface InviteMemberInput {
  email: string;
  role: UserRole;
  // set only by the dialog's "Resend invite" button, after the server reported
  // 'already-invited'; without it a pending invite is never sent again
  resend?: boolean;
}

export interface InviteFieldErrors {
  email?: string;
  role?: string;
}

// a result, not a thrown error: next hides thrown server action errors from the
// client in production, so every expected outcome is a value the dialog can show
export type InviteMemberResult =
  | { status: 'sent'; message: string }
  | { status: 'resent'; message: string }
  | { status: 'invalid'; message: string; fieldErrors: InviteFieldErrors }
  | { status: 'forbidden'; message: string }
  // canResend: false when the pending invite's role is one this inviter can't
  // assign; the dialog then offers no resend
  | { status: 'already-invited'; message: string; canResend: boolean }
  | { status: 'already-member'; message: string }
  // the Auth server's email limit; trying again later works
  | { status: 'rate-limited'; message: string }
  | { status: 'error'; message: string }
  // the session was revoked or blocked mid-use; the dialog loads signOutPath as
  // a full page so the sign-out route handler can clear the cookies
  | { status: 'signed-out'; message: string; signOutPath: string };

export type InviteMemberStatus = InviteMemberResult['status'];
