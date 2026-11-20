'use client';

import { useQuery } from '@tanstack/react-query';

import { getSignedInUserId } from '@/lib/api/auth/queries';
import {
  mapTrackerReviewRowToTrackerReview,
  mapTrackerRowToTracker,
  mapTrackersRowsToTrackers,
  TRACKER_COLUMNS,
  TRACKER_REVIEW_COLUMNS
} from '@/lib/api/trackers/mappers';
import type { MemberTrackersInput, ProjectTrackersInput, Tracker, TrackerReview } from '@/lib/api/trackers/types';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

export const trackerKeys = {
  all: ['trackers'] as const,
  lists: () => [...trackerKeys.all, 'list'] as const,
  list: () => [...trackerKeys.lists()] as const,
  project: (input: ProjectTrackersInput) => [...trackerKeys.all, 'project', input] as const,
  member: (input: MemberTrackersInput) => [...trackerKeys.all, 'member', input] as const,
  reviews: (input: MemberTrackersInput) => [...trackerKeys.all, 'reviews', input] as const,
  activeLive: () => [...trackerKeys.all, 'active-live'] as const
};

// RLS returns every entry to admins, entries on the projects they manage to managers, and only their own to staff
export async function getProjectTrackers({ projectId, from, to }: ProjectTrackersInput): Promise<Tracker[]> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase
    .from('trackers')
    .select(TRACKER_COLUMNS)
    .eq('project_id', projectId)
    .gte('date', from)
    .lte('date', to);

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapTrackersRowsToTrackers(data);
}

export function useProjectTrackers(input: ProjectTrackersInput) {
  return useQuery<Tracker[], ApiError>({
    queryKey: trackerKeys.project(input),
    queryFn: () => getProjectTrackers(input)
  });
}

export async function getTrackers(): Promise<Tracker[]> {
  const supabase = createBrowserClient();
  const userId = await getSignedInUserId();

  if (!userId) {
    return [];
  }

  const { data, error, status } = await supabase
    .from('trackers')
    .select(TRACKER_COLUMNS)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: true });

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

export async function getActiveLiveTracker(): Promise<Tracker | null> {
  const supabase = createBrowserClient();
  const userId = await getSignedInUserId();

  if (!userId) {
    return null;
  }

  const { data, error, status } = await supabase
    .from('trackers')
    .select(TRACKER_COLUMNS)
    .eq('user_id', userId)
    .eq('is_live', true)
    .in('live_status', ['start', 'pause'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return data ? mapTrackerRowToTracker(data) : null;
}

export function useActiveLiveTracker() {
  return useQuery({
    queryKey: trackerKeys.activeLive(),
    queryFn: getActiveLiveTracker
  });
}

// one person's entries for review. rls limits managers to the projects they manage, so a
// manager may see only part of a member's time
export function getMemberTrackers({ userId, from, to }: MemberTrackersInput): Promise<Tracker[]> {
  return fetchUserTrackers({ userId, range: { from, to } });
}

export function useMemberTrackers(input: MemberTrackersInput) {
  return useQuery<Tracker[], ApiError>({
    queryKey: trackerKeys.member(input),
    queryFn: () => getMemberTrackers(input)
  });
}

// review history of one member's entries in a date range, newest first. filtering through
// the trackers join keeps the url and the cache key small, whatever the number of entries.
// rls returns rows only to managers and admins, for entries they can see
export async function getTrackerReviews({ userId, from, to }: MemberTrackersInput): Promise<TrackerReview[]> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase
    .from('tracker_reviews')
    .select(`${TRACKER_REVIEW_COLUMNS}, trackers!inner(user_id, date)`)
    .eq('trackers.user_id', userId)
    .gte('trackers.date', from)
    .lte('trackers.date', to)
    .order('created_at', { ascending: false });

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return data.map(mapTrackerReviewRowToTrackerReview);
}

export function useTrackerReviews(input: MemberTrackersInput) {
  return useQuery<TrackerReview[], ApiError>({
    queryKey: trackerKeys.reviews(input),
    queryFn: () => getTrackerReviews(input)
  });
}

// newest day first, then in the order they were logged
async function fetchUserTrackers({ userId, range }: FetchUserTrackersInput): Promise<Tracker[]> {
  const supabase = createBrowserClient();
  let query = supabase.from('trackers').select(TRACKER_COLUMNS).eq('user_id', userId);

  if (range) {
    query = query.gte('date', range.from).lte('date', range.to);
  }

  const { data, error, status } = await query.order('date', { ascending: false }).order('created_at', { ascending: true });

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapTrackersRowsToTrackers(data);
}

interface FetchUserTrackersInput {
  userId: string;
  range?: { from: string; to: string };
}
