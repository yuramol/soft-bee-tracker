'use client';

import { useQuery } from '@tanstack/react-query';

import { mapProjectsRowsToProjects, PROJECT_COLUMNS } from '@/lib/api/projects/mappers';
import type { Project } from '@/lib/api/projects/types';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: () => [...projectKeys.lists(), 'all'] as const,
  userList: () => [...projectKeys.lists(), 'user'] as const
};

export async function getProjects(): Promise<Project[]> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase.from('projects').select(PROJECT_COLUMNS);

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapProjectsRowsToProjects(data);
}

export async function getUserProjects(): Promise<Project[]> {
  const supabase = createBrowserClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw {
      message: userError.message,
      statusCode: userError.status ?? 401
    } satisfies ApiError;
  }

  if (!userData.user) {
    return [];
  }

  // role comes from the verified user_role JWT claim (same one RLS checks)
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();

  if (claimsError || !claimsData) {
    throw {
      message: claimsError?.message ?? 'Unable to verify session',
      statusCode: 401
    } satisfies ApiError;
  }

  const query = supabase.from('projects').select(PROJECT_COLUMNS);
  // admin sees every project; manager is bound to the projects they manage.
  // worker (and others) are not filtered by manager_id: RLS returns only the
  // projects they are assigned to via project_rates.
  // claims are loosely typed (any); unknown is intentional, the role is only compared by value
  const userRole: unknown = claimsData.claims.user_role;
  const scopedQuery = userRole === 'manager' ? query.eq('manager_id', userData.user.id) : query;

  const { data, error, status } = await scopedQuery;

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapProjectsRowsToProjects(data);
}

export function useProjects(isEnabled = true) {
  return useQuery<Project[], ApiError>({
    queryKey: projectKeys.list(),
    queryFn: getProjects,
    enabled: isEnabled
  });
}

export function useUserProjects() {
  return useQuery<Project[], ApiError>({
    queryKey: projectKeys.userList(),
    queryFn: getUserProjects
  });
}
