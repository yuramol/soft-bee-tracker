'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  LEAVE_REQUEST_COLUMNS,
  mapCreateLeaveRequestInputToRow,
  mapLeaveErrorToApiError,
  mapLeaveRequestRowToLeaveRequest
} from '@/lib/api/leave/mappers';
import { leaveKeys } from '@/lib/api/leave/queries';
import type { CreateLeaveRequestInput, LeaveRequest } from '@/lib/api/leave/types';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';
import content from './content.json';

export async function createLeaveRequest(input: CreateLeaveRequestInput): Promise<LeaveRequest> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase
    .from('leave_requests')
    .insert(mapCreateLeaveRequestInputToRow(input))
    .select(LEAVE_REQUEST_COLUMNS)
    .single();

  if (error) {
    throw mapLeaveErrorToApiError(error, status);
  }

  return mapLeaveRequestRowToLeaveRequest(data);
}

// errors are left to the caller: the request dialog shows them inline and keeps the form
export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation<LeaveRequest, ApiError, CreateLeaveRequestInput>({
    mutationFn: createLeaveRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: leaveKeys.all });
      toast.success(content.requested);
    }
  });
}

// rls only lets the owner update a pending request, so an approved one returns no row (PGRST116)
export async function cancelLeaveRequest(requestId: string): Promise<LeaveRequest> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase
    .from('leave_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .select(LEAVE_REQUEST_COLUMNS)
    .single();

  if (error) {
    throw mapLeaveErrorToApiError(error, status);
  }

  return mapLeaveRequestRowToLeaveRequest(data);
}

export function useCancelLeaveRequest() {
  const queryClient = useQueryClient();

  return useMutation<LeaveRequest, ApiError, string>({
    mutationFn: cancelLeaveRequest,
    onSuccess: () => {
      toast.success(content.cancelled);
    },
    onError: (error) => {
      toast.error(error.message);
    },
    // refetch either way: a failed cancel usually means the status changed elsewhere
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    }
  });
}
