'use client';

import { useQuery } from '@tanstack/react-query';

import { mapTrackersRowsToTrackers } from '@/lib/api/trackers/mappers';
import type { Tracker } from '@/lib/api/trackers/types';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

export const trackerKeys = {
  all: ['trackers'] as const,
  lists: () => [...trackerKeys.all, 'list'] as const,
  list: () => [...trackerKeys.lists()] as const
};

export async function getTrackers(): Promise<Tracker[]> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase.from('trackers').select('*');

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapTrackersRowsToTrackers(data);
}

export function useTrackers() {
  return useQuery({
    queryKey: trackerKeys.list(),
    queryFn: getTrackers
  });
}
