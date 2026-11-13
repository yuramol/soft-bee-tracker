'use client';

import { useQuery } from '@tanstack/react-query';

import {
  LEAVE_ALLOWANCE_COLUMNS,
  LEAVE_REQUEST_COLUMNS,
  mapLeaveAllowanceRowToLeaveAllowance,
  mapLeaveErrorToApiError,
  mapLeaveRequestRowToLeaveRequest
} from '@/lib/api/leave/mappers';
import type { LeaveAllowance, LeaveRequest } from '@/lib/api/leave/types';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

export const leaveKeys = {
  all: ['leave'] as const,
  myRequests: () => [...leaveKeys.all, 'requests', 'mine'] as const,
  myAllowances: () => [...leaveKeys.all, 'allowances', 'mine'] as const
};

export async function getMyLeaveRequests(): Promise<LeaveRequest[]> {
  const supabase = createBrowserClient();
  const userId = await getSignedInUserId();

  if (!userId) {
    return [];
  }

  // managers can read everyone's requests, so filter to the signed-in user explicitly
  const { data, error, status } = await supabase
    .from('leave_requests')
    .select(LEAVE_REQUEST_COLUMNS)
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) {
    throw mapLeaveErrorToApiError(error, status);
  }

  return data.map(mapLeaveRequestRowToLeaveRequest);
}

export function useMyLeaveRequests() {
  return useQuery({
    queryKey: leaveKeys.myRequests(),
    queryFn: getMyLeaveRequests
  });
}

export async function getMyLeaveAllowances(): Promise<LeaveAllowance[]> {
  const supabase = createBrowserClient();
  const userId = await getSignedInUserId();

  if (!userId) {
    return [];
  }

  const { data, error, status } = await supabase.from('leave_allowances').select(LEAVE_ALLOWANCE_COLUMNS).eq('user_id', userId);

  if (error) {
    throw mapLeaveErrorToApiError(error, status);
  }

  return data.map(mapLeaveAllowanceRowToLeaveAllowance);
}

export function useMyLeaveAllowances() {
  return useQuery({
    queryKey: leaveKeys.myAllowances(),
    queryFn: getMyLeaveAllowances
  });
}

async function getSignedInUserId(): Promise<string | null> {
  const supabase = createBrowserClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw {
      message: error.message,
      statusCode: error.status ?? 401
    } satisfies ApiError;
  }

  return data.user?.id ?? null;
}
