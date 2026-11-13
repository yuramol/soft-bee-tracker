'use client';

import { useMutation } from '@tanstack/react-query';

import { inviteMember } from '@/lib/api/invites/actions';

// thin wrapper: the server action does every check and returns a result for
// each expected outcome, so onSuccess handles "already invited" and the like;
// onError only sees network failures
export function useInviteMember() {
  return useMutation({ mutationFn: inviteMember });
}
