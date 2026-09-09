import { mapProjectRowToProject, mapProjectToProjectRow } from '@/lib/api/projects/mappers';
import type { CreateProjectInput, Project } from '@/lib/api/projects/types';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const supabase = createBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw {
      message: userError.message,
      statusCode: userError.status ?? 401
    } satisfies ApiError;
  }

  if (!userData.user) {
    throw {
      message: 'You must be signed in to create a project',
      statusCode: 401
    } satisfies ApiError;
  }

  const { data, error, status } = await supabase
    .from('projects')
    .insert(mapProjectToProjectRow(input, userData.user.id))
    .select('*')
    .single();

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapProjectRowToProject(data);
}
