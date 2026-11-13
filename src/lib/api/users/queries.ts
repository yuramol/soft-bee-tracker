'use client';

import { useQuery } from '@tanstack/react-query';

import { mapProjectPersonRows } from '@/lib/api/users/mappers';
import type { ProjectPerson } from '@/lib/api/users/types';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

export const userKeys = {
  all: ['users'] as const,
  projectPeople: () => [...userKeys.all, 'project-people'] as const
};

// everyone for admins and managers; staff get the people who share a project with them
export async function getProjectPeople(): Promise<ProjectPerson[]> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase.rpc('get_project_people');

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapProjectPersonRows(data);
}

export function useProjectPeople() {
  return useQuery<ProjectPerson[], ApiError>({
    queryKey: userKeys.projectPeople(),
    queryFn: getProjectPeople
  });
}
