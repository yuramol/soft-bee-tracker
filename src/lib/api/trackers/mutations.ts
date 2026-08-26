'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { mapCreateTrackerInputToRow, mapTrackerRowToTracker } from '@/lib/api/trackers/mappers';
import { trackerKeys } from '@/lib/api/trackers/queries';
import type { CreateTrackerInput, Tracker } from '@/lib/api/trackers/types';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

interface UseCreateTrackerOptions {
  onSuccess?: (tracker: Tracker) => void;
}

export async function createTracker(input: CreateTrackerInput): Promise<Tracker> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase
    .from('trackers')
    .insert(mapCreateTrackerInputToRow(input))
    .select('*')
    .single();

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapTrackerRowToTracker(data);
}

export function useCreateTracker(options?: UseCreateTrackerOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTracker,
    onSuccess: (tracker) => {
      void queryClient.invalidateQueries({ queryKey: trackerKeys.all });
      toast.success('Tracker created');
      options?.onSuccess?.(tracker);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });
}
