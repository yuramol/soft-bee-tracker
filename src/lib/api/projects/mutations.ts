import { mapProjectRowToProject, mapProjectToProjectRow } from '@/lib/api/projects/mappers';
import type { CreateProjectInput, Project } from '@/lib/api/projects/types';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase.from('projects').insert(mapProjectToProjectRow(input)).select('*').single();

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapProjectRowToProject(data);
}
