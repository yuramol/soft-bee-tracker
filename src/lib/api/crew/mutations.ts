'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { mapGrantLeaveInputToRow, mapPositionToJson } from '@/lib/api/crew/mappers';
import { crewKeys } from '@/lib/api/crew/queries';
import type {
  ChangeMemberRoleInput,
  GrantLeaveInput,
  ReviewLeaveRequestInput,
  SetLeaveAllowanceInput,
  SetMemberBlockedInput,
  UpdateMemberEmploymentInput
} from '@/lib/api/crew/types';
import { mapLeaveErrorToApiError } from '@/lib/api/leave/mappers';
import { leaveKeys } from '@/lib/api/leave/queries';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';
import type { Database } from '@/types';
import content from './content.json';

// rls hides rows the caller may not change, so "no row came back" means not allowed
const NO_ROWS_ERROR_CODE = 'PGRST116';

export async function changeMemberRole({ memberId, role }: ChangeMemberRoleInput): Promise<void> {
  await updateAccess(memberId, { role });
}

export async function setMemberBlocked({ memberId, isBlocked }: SetMemberBlockedInput): Promise<void> {
  await updateAccess(memberId, { is_blocked: isBlocked });
}

export async function updateMemberEmployment({ memberId, position, employmentDate }: UpdateMemberEmploymentInput): Promise<void> {
  const update: Database['public']['Tables']['users']['Update'] = {};

  if (position !== undefined) {
    update.positions = mapPositionToJson(position);
  }

  if (employmentDate !== undefined) {
    update.date_employment = employmentDate;
  }

  const supabase = createBrowserClient();
  const { error, status } = await supabase.from('users').update(update).eq('id', memberId).select('id').single();

  if (error) {
    throw toCrewApiError(error, status);
  }
}

export async function reviewLeaveRequest({ requestId, decision }: ReviewLeaveRequestInput): Promise<void> {
  const supabase = createBrowserClient();
  const { error, status } = await supabase.from('leave_requests').update({ status: decision }).eq('id', requestId).select('id').single();

  if (error) {
    throw mapLeaveErrorToApiError(error, status);
  }
}

export async function grantLeave(input: GrantLeaveInput): Promise<void> {
  const supabase = createBrowserClient();
  const { error, status } = await supabase.from('leave_requests').insert(mapGrantLeaveInputToRow(input)).select('id').single();

  if (error) {
    throw mapLeaveErrorToApiError(error, status);
  }
}

export async function setLeaveAllowance({ memberId, year, leaveType, days }: SetLeaveAllowanceInput): Promise<void> {
  const supabase = createBrowserClient();
  const { error, status } = await supabase
    .from('leave_allowances')
    .upsert({ user_id: memberId, year, leave_type: leaveType, days }, { onConflict: 'user_id,year,leave_type' })
    .select('id')
    .single();

  if (error) {
    throw toCrewApiError(error, status);
  }
}

export function useChangeMemberRole() {
  return useCrewMutation(changeMemberRole);
}

export function useSetMemberBlocked() {
  return useCrewMutation(setMemberBlocked);
}

export function useUpdateMemberEmployment() {
  return useCrewMutation(updateMemberEmployment);
}

export function useReviewLeaveRequest() {
  return useCrewMutation(reviewLeaveRequest);
}

export function useSetLeaveAllowance() {
  return useCrewMutation(setLeaveAllowance);
}

// errors are left to the caller: the grant dialog shows them inline and keeps the form
export function useGrantLeave() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, GrantLeaveInput>({
    mutationFn: grantLeave,
    onSuccess: () => {
      invalidateCrew(queryClient);
    }
  });
}

// shared shape: refetch the crew (and the signed-in user's own leave, which a review
// or grant can change) and toast failures. success toasts stay with the caller,
// which knows the person's name.
function useCrewMutation<TInput>(mutationFn: (input: TInput) => Promise<void>) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, TInput>({
    mutationFn,
    onError: (error) => {
      toast.error(error.message);
    },
    onSettled: () => {
      invalidateCrew(queryClient);
    }
  });
}

function invalidateCrew(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: crewKeys.all });
  void queryClient.invalidateQueries({ queryKey: leaveKeys.all });
}

async function updateAccess(memberId: string, update: Database['public']['Tables']['user_access']['Update']): Promise<void> {
  const supabase = createBrowserClient();
  const { error, status } = await supabase.from('user_access').update(update).eq('user_id', memberId).select('user_id').single();

  if (error) {
    throw toCrewApiError(error, status);
  }
}

function toCrewApiError(error: { code: string; message: string }, statusCode: number): ApiError {
  if (error.code === NO_ROWS_ERROR_CODE || error.code === '42501') {
    return { message: content.errors.notAllowed, statusCode };
  }

  return { message: content.errors.unexpected, statusCode };
}
