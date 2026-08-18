import { mapProjectsRowsToProjects } from '@/lib/api/projects/mappers';
import type { Project } from '@/lib/api/projects/types';
import { createBrowserClient } from '@/lib/supabase/client';
import type { ApiError } from '@/types/api-error';

export async function getProjects(): Promise<Project[]> {
  const supabase = createBrowserClient();
  const { data, error, status } = await supabase.from('projects').select('*');

  if (error) {
    throw {
      message: error.message,
      statusCode: status
    } satisfies ApiError;
  }

  return mapProjectsRowsToProjects(data);
}
