'use client';

import { useQuery } from '@tanstack/react-query';

import { mapProjectsRowsToProjects, PROJECT_COLUMNS } from '@/lib/api/projects/mappers';
import type { MemberProject, Project, ProjectStatus } from '@/lib/api/projects/types';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: () => [...projectKeys.lists(), 'all'] as const,
  userList: () => [...projectKeys.lists(), 'user'] as const,
  memberList: () => [...projectKeys.lists(), 'member'] as const
};

const STATUS_ORDER: Record<ProjectStatus, number> = { active: 0, archived: 1 };

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

  const { data, error, status } = await supabase.from('projects').select(PROJECT_COLUMNS).eq('manager_id', userData.user.id);

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapProjectsRowsToProjects(data);
}

// a user belongs to a project when they manage it or hold a rate on it
export async function getMyProjects(): Promise<MemberProject[]> {
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

  const userId = userData.user.id;
  const rates = await supabase.from('project_rates').select('project_id').eq('user_id', userId);

  if (rates.error) {
    throw {
      message: rates.error.message,
      statusCode: rates.status
    } satisfies ApiError;
  }

  const memberProjectIds = [...new Set(rates.data.map((rate) => rate.project_id))];
  const filter = memberProjectIds.length > 0 ? `manager_id.eq.${userId},id.in.(${memberProjectIds.join(',')})` : `manager_id.eq.${userId}`;
  const { data, error, status } = await supabase.from('projects').select(PROJECT_COLUMNS).or(filter);

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return toMemberProjects(mapProjectsRowsToProjects(data), userId);
}

export function toMemberProjects(projects: Project[], userId: string): MemberProject[] {
  return projects
    .map((project) => ({ project, membership: project.managerId === userId ? ('manager' as const) : ('member' as const) }))
    .sort((a, b) => STATUS_ORDER[a.project.status] - STATUS_ORDER[b.project.status] || a.project.name.localeCompare(b.project.name));
}

export function useMyProjects() {
  return useQuery<MemberProject[], ApiError>({
    queryKey: projectKeys.memberList(),
    queryFn: getMyProjects
  });
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
