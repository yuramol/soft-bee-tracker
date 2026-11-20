'use client';

import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';

import { format } from 'date-fns';

import { crewKeys } from '@/lib/api/crew/queries';
import {
  isTrackerStatusChangedError,
  mapCreateTrackerInputToRow,
  mapStartLiveTrackerInputToRow,
  mapTrackerReviewErrorToApiError,
  mapTrackerWriteErrorToApiError,
  mapTrackerRowToTracker,
  TRACKER_COLUMNS,
  TRACKER_STATUS_CHANGED_CODE,
  type UpdateTrackerRow
} from '@/lib/api/trackers/mappers';
import { trackerKeys } from '@/lib/api/trackers/queries';
import type {
  CreateTrackerInput,
  FinishLiveTrackerInput,
  StartLiveTrackerInput,
  Tracker,
  TrackerReviewNoteInput,
  TrackerStatus,
  UpdateTrackerInput
} from '@/lib/api/trackers/types';
import { getLiveElapsedMinutes, getLiveWholeMinutes } from '@/lib/tracker/live-tracker';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';
import content from './content.json';

// 2× the Toaster default in @ui/sonner (2500ms) so concurrent-status warnings stay readable
const WARNING_TOAST_DURATION_MS = 5000;

interface UseTrackerMutationOptions {
  onSuccess?: () => void;
  // status already moved by another reviewer — UI should refresh / close review dialogs
  onConcurrentStatusChange?: () => void;
}

interface TrackerMutationConfig<TInput> {
  mutationFn: (input: TInput) => Promise<Tracker>;
  successMessage: string;
  options?: UseTrackerMutationOptions;
  extraInvalidateKeys?: QueryKey[];
}

export async function createTracker(input: CreateTrackerInput): Promise<Tracker> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase
    .from('trackers')
    .insert(mapCreateTrackerInputToRow(input))
    .select(TRACKER_COLUMNS)
    .single();

  if (error) {
    throw mapTrackerWriteErrorToApiError(error, status);
  }

  return mapTrackerRowToTracker(data);
}

export function useCreateTracker(options?: UseTrackerMutationOptions) {
  return useTrackerMutation({ mutationFn: createTracker, successMessage: content.created, options });
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
    throw mapTrackerWriteErrorToApiError(error, status);
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
    throw mapTrackerWriteErrorToApiError(error, status);
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

// only delete while status still matches what the ui showed. a concurrent review (or rls
// hiding a non-new row) returns no rows — same cancelled warning as approve/reject races
export async function deleteTracker(tracker: Tracker): Promise<Tracker> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase.from('trackers').delete().eq('id', tracker.id).eq('status', tracker.status).select('id');

  if (error) {
    throw mapTrackerWriteErrorToApiError(error, status);
  }

  if (!data?.length) {
    throw {
      message: content.reviewErrors.statusChanged,
      statusCode: status || 409,
      code: TRACKER_STATUS_CHANGED_CODE
    } satisfies ApiError;
  }

  return tracker;
}

// optimistic status filter: only update when the row is still in the expected previous status.
// a same-status retry (e.g. approve on already approved) would otherwise succeed silently because
// the review trigger treats new.status = old.status as a no-op; "no row returned" then means the
// status already moved (or the viewer has no access / the row was deleted)
export function approveTracker(trackerId: string): Promise<Tracker> {
  return updateTrackerReview(trackerId, { status: 'approved' }, ['new']);
}

export function rejectTracker({ trackerId, note }: TrackerReviewNoteInput): Promise<Tracker> {
  return updateTrackerReview(trackerId, { status: 'rejected', review_note: note.trim() }, ['new']);
}

// undo keeps review_note on the entry so private.log_tracker_review can copy it into
// tracker_reviews; the ui only shows the note while status is rejected
export function undoTrackerReview({ trackerId, note }: TrackerReviewNoteInput): Promise<Tracker> {
  return updateTrackerReview(trackerId, { status: 'new', review_note: note.trim() }, ['approved', 'rejected']);
}

async function updateTrackerReview(trackerId: string, changes: UpdateTrackerRow, expectedStatuses: TrackerStatus[]): Promise<Tracker> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase
    .from('trackers')
    .update(changes)
    .eq('id', trackerId)
    .in('status', expectedStatuses)
    .select(TRACKER_COLUMNS)
    .single();

  if (error) {
    throw mapTrackerReviewErrorToApiError(error, status);
  }

  return mapTrackerRowToTracker(data);
}

async function updateTrackerRow(trackerId: string, changes: UpdateTrackerRow): Promise<Tracker> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase.from('trackers').update(changes).eq('id', trackerId).select(TRACKER_COLUMNS).single();

  if (error) {
    throw mapTrackerWriteErrorToApiError(error, status);
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
    throw mapTrackerWriteErrorToApiError(error, status);
  }

  return mapTrackerRowToTracker(data);
}

export function useStartLiveTracker(options?: UseTrackerMutationOptions) {
  return useTrackerMutation({ mutationFn: startLiveTracker, successMessage: content.timerStarted, options });
}

export function usePauseLiveTracker() {
  return useTrackerMutation({ mutationFn: pauseLiveTracker, successMessage: content.timerPaused });
}

export function useResumeLiveTracker() {
  return useTrackerMutation({ mutationFn: resumeLiveTracker, successMessage: content.timerResumed });
}

export function useFinishLiveTracker(options?: UseTrackerMutationOptions) {
  return useTrackerMutation({ mutationFn: finishLiveTracker, successMessage: content.entrySaved, options });
}

export function useRestartLiveTracker() {
  return useTrackerMutation({ mutationFn: restartLiveTracker, successMessage: content.timerResumed });
}

export function useUpdateTracker(options?: UseTrackerMutationOptions) {
  return useTrackerMutation({ mutationFn: updateTracker, successMessage: content.entryUpdated, options });
}

export function useDeleteTracker(options?: UseTrackerMutationOptions) {
  return useTrackerMutation({ mutationFn: deleteTracker, successMessage: content.entryDeleted, options });
}

export function useDiscardLiveTracker() {
  return useTrackerMutation({ mutationFn: discardLiveTracker, successMessage: content.timerDiscarded });
}

// approving does not change any crew totals (only rejected time is left out), so the crew
// snapshot stays cached; reject and undo do change them
export function useApproveTracker(options?: UseTrackerMutationOptions) {
  return useTrackerMutation({ mutationFn: approveTracker, successMessage: content.entryApproved, options });
}

export function useRejectTracker(options?: UseTrackerMutationOptions) {
  return useTrackerMutation({
    mutationFn: rejectTracker,
    successMessage: content.entryRejected,
    options,
    extraInvalidateKeys: REVIEW_INVALIDATE_KEYS
  });
}

export function useUndoTrackerReview(options?: UseTrackerMutationOptions) {
  return useTrackerMutation({
    mutationFn: undoTrackerReview,
    successMessage: content.reviewUndone,
    options,
    extraInvalidateKeys: REVIEW_INVALIDATE_KEYS
  });
}

// reject and undo change the crew snapshot: its time totals leave rejected entries out
const REVIEW_INVALIDATE_KEYS: QueryKey[] = [crewKeys.all];

function useTrackerMutation<TInput>({ mutationFn, successMessage, options, extraInvalidateKeys = [] }: TrackerMutationConfig<TInput>) {
  const queryClient = useQueryClient();

  return useMutation<Tracker, ApiError, TInput>({
    mutationFn,
    onSuccess: () => {
      toast.success(successMessage);
      options?.onSuccess?.();
    },
    onError: (error) => {
      if (isTrackerStatusChangedError(error)) {
        toast.warning(error.message, { duration: WARNING_TOAST_DURATION_MS });
        options?.onConcurrentStatusChange?.();
        return;
      }

      toast.error(error.message);
    },
    onSettled: () => {
      for (const queryKey of [trackerKeys.all, ...extraInvalidateKeys]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    }
  });
}
