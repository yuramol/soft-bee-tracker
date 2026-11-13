'use client';

import { useQuery } from '@tanstack/react-query';

import {
  buildCrew,
  CREW_LEAVE_ALLOWANCE_COLUMNS,
  CREW_LEAVE_REQUEST_COLUMNS,
  CREW_PROJECT_COLUMNS,
  CREW_PROJECT_RATE_COLUMNS,
  CREW_USER_COLUMNS,
  getCrewTrackerStartDate
} from '@/lib/api/crew/mappers';
import type { Crew } from '@/lib/api/crew/types';
import { mapTrackersRowsToTrackers, TRACKER_COLUMNS } from '@/lib/api/trackers/mappers';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

export const crewKeys = {
  all: ['crew'] as const
};

// one snapshot for the crew list, profiles and leave review. rls decides what comes
// back: managers and admins read every row of these tables.
export async function getCrew(): Promise<Crew> {
  const supabase = createBrowserClient();
  const now = new Date();
  const [users, projects, projectRates, trackers, leaveRequests, allowances] = await Promise.all([
    supabase.from('users').select(CREW_USER_COLUMNS),
    supabase.from('projects').select(CREW_PROJECT_COLUMNS),
    supabase.from('project_rates').select(CREW_PROJECT_RATE_COLUMNS),
    supabase.from('trackers').select(TRACKER_COLUMNS).gte('date', getCrewTrackerStartDate(now)),
    supabase.from('leave_requests').select(CREW_LEAVE_REQUEST_COLUMNS).order('start_date', { ascending: true }),
    supabase.from('leave_allowances').select(CREW_LEAVE_ALLOWANCE_COLUMNS)
  ]);

  for (const result of [users, projects, projectRates, trackers, leaveRequests, allowances]) {
    if (result.error) {
      throw {
        message: result.error.message,
        statusCode: result.status
      } satisfies ApiError;
    }
  }

  return buildCrew(
    {
      users: users.data ?? [],
      projects: projects.data ?? [],
      projectRates: projectRates.data ?? [],
      trackers: mapTrackersRowsToTrackers(trackers.data ?? []),
      leaveRequests: leaveRequests.data ?? [],
      allowances: allowances.data ?? []
    },
    now
  );
}

export function useCrew() {
  return useQuery<Crew, ApiError>({
    queryKey: crewKeys.all,
    queryFn: getCrew
  });
}
