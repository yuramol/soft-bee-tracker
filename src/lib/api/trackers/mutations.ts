'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { format } from 'date-fns';

import {
  mapCreateTrackerInputToRow,
  mapStartLiveTrackerInputToRow,
  mapTrackerRowToTracker,
  TRACKER_COLUMNS,
  type UpdateTrackerRow
} from '@/lib/api/trackers/mappers';
import { trackerKeys } from '@/lib/api/trackers/queries';
import type {
  CreateTrackerInput,
  FinishLiveTrackerInput,
  StartLiveTrackerInput,
  Tracker,
  UpdateTrackerInput
} from '@/lib/api/trackers/types';
import { getLiveElapsedMinutes, getLiveWholeMinutes } from '@/lib/live-tracker';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';
import content from './content.json';

interface UseTrackerMutationOptions {
  onSuccess?: (tracker: Tracker) => void;
}

export async function createTracker(input: CreateTrackerInput): Promise<Tracker> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase
    .from('trackers')
    .insert(mapCreateTrackerInputToRow(input))
    .select(TRACKER_COLUMNS)
    .single();

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapTrackerRowToTracker(data);
}

export function useCreateTracker(options?: UseTrackerMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTracker,
    onSuccess: (tracker) => {
      void queryClient.invalidateQueries({ queryKey: trackerKeys.all });
      toast.success(content.created);
      options?.onSuccess?.(tracker);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });
}

export async function startLiveTracker(input: StartLiveTrackerInput): Promise<Tracker> {
  const supabase = createBrowserClient();
  const startedAt = new Date();
  const { data, error, status } = await supabase
    .from('trackers')
    .insert(mapStartLiveTrackerInputToRow(input, startedAt, format(startedAt, 'yyyy-MM-dd')))
    .select(TRACKER_COLUMNS)
    .single();

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapTrackerRowToTracker(data);
}

export function pauseLiveTracker(tracker: Tracker): Promise<Tracker> {
  return updateLiveTracker(tracker.id, {
    live_status: 'pause',
    live_duration_minutes: getLiveWholeMinutes(tracker, new Date()),
    start_live_date: null
  });
}

export function resumeLiveTracker(tracker: Tracker): Promise<Tracker> {
  return updateLiveTracker(tracker.id, {
    live_status: 'start',
    start_live_date: new Date().toISOString()
  });
}

export function finishLiveTracker({ tracker, entry }: FinishLiveTrackerInput): Promise<Tracker> {
  return updateLiveTracker(tracker.id, {
    live_status: 'finish',
    live_duration_minutes: getLiveElapsedMinutes(tracker, new Date()),
    start_live_date: null,
    project_id: entry.projectId,
    date: entry.date,
    description: entry.description,
    duration_minutes: entry.durationMinutes
  });
}

export async function discardLiveTracker(tracker: Tracker): Promise<Tracker> {
  if (tracker.durationMinutes > 0) {
    return updateLiveTracker(tracker.id, {
      live_status: 'finish',
      live_duration_minutes: tracker.durationMinutes,
      start_live_date: null
    });
  }

  const supabase = createBrowserClient();
  const { error, status } = await supabase.from('trackers').delete().eq('id', tracker.id).in('live_status', ['start', 'pause']);

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return tracker;
}

export async function restartLiveTracker(tracker: Tracker): Promise<Tracker> {
  return updateTrackerRow(tracker.id, {
    is_live: true,
    live_status: 'start',
    live_duration_minutes: tracker.durationMinutes,
    start_live_date: new Date().toISOString()
  });
}

export function updateTracker({ trackerId, entry }: UpdateTrackerInput): Promise<Tracker> {
  return updateTrackerRow(trackerId, mapCreateTrackerInputToRow(entry));
}

export async function deleteTracker(tracker: Tracker): Promise<Tracker> {
  const supabase = createBrowserClient();
  const { error, status } = await supabase.from('trackers').delete().eq('id', tracker.id);

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return tracker;
}

async function updateTrackerRow(trackerId: string, changes: UpdateTrackerRow): Promise<Tracker> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase.from('trackers').update(changes).eq('id', trackerId).select(TRACKER_COLUMNS).single();

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapTrackerRowToTracker(data);
}

async function updateLiveTracker(trackerId: string, changes: UpdateTrackerRow): Promise<Tracker> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase
    .from('trackers')
    .update(changes)
    .eq('id', trackerId)
    .in('live_status', ['start', 'pause'])
    .select(TRACKER_COLUMNS)
    .single();

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapTrackerRowToTracker(data);
}

export function useStartLiveTracker(options?: UseTrackerMutationOptions) {
  return useTrackerMutation(startLiveTracker, content.timerStarted, options);
}

export function usePauseLiveTracker() {
  return useTrackerMutation(pauseLiveTracker, content.timerPaused);
}

export function useResumeLiveTracker() {
  return useTrackerMutation(resumeLiveTracker, content.timerResumed);
}

export function useFinishLiveTracker(options?: UseTrackerMutationOptions) {
  return useTrackerMutation(finishLiveTracker, content.entrySaved, options);
}

export function useRestartLiveTracker() {
  return useTrackerMutation(restartLiveTracker, content.timerResumed);
}

export function useUpdateTracker(options?: UseTrackerMutationOptions) {
  return useTrackerMutation(updateTracker, content.entryUpdated, options);
}

export function useDeleteTracker(options?: UseTrackerMutationOptions) {
  return useTrackerMutation(deleteTracker, content.entryDeleted, options);
}

export function useDiscardLiveTracker() {
  return useTrackerMutation(discardLiveTracker, content.timerDiscarded);
}

function useTrackerMutation<TInput>(
  mutationFn: (input: TInput) => Promise<Tracker>,
  successMessage: string,
  options?: UseTrackerMutationOptions
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (tracker) => {
      void queryClient.invalidateQueries({ queryKey: trackerKeys.all });
      toast.success(successMessage);
      options?.onSuccess?.(tracker);
    },
    onError: (error: ApiError) => {
      toast.error(error.message);
    }
  });
}
